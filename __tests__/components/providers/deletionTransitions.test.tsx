import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AccountTeardownGate } from '@/components/providers/AccountTeardownGate';
import { STRINGS } from '@/constants/strings';
import { createAccountTeardown } from '@/services/accountTeardown';
import type { DeletionIO, DeletionPhase } from '@/services/deletionMachine';

let mockLifecycle: ReturnType<typeof createAccountTeardown>;
jest.mock('@/services/accountLifecycle', () => ({
  get accountTeardown() {
    return mockLifecycle;
  },
}));
jest.mock('expo-splash-screen', () => ({ hide: jest.fn() }));

const phases = ['idle', 'requested', 'confirmed', 'teardown'] as const;
// Columns are the durable state at entry. Each row exercises the real journal,
// driver and rendered root gate; a late RPC result can only affect requested.
type Outcome = 'done' | 'failed' | 'retry' | 'discarded';
const cases = {
  rpcOk: ['done', 'done', 'done', 'done'],
  rpcLost: ['retry', 'retry', 'done', 'done'],
  rpcError: ['failed', 'failed', 'done', 'done'],
  sessionValid: ['done', 'failed', 'done', 'done'],
  sessionMissing: ['failed', 'done', 'done', 'done'],
  sessionSwitched: ['failed', 'failed', 'discarded', 'discarded'],
  sessionExpired: ['failed', 'done', 'done', 'done'],
  killed: ['done', 'failed', 'done', 'done'],
  retry: ['done', 'done', 'done', 'done'],
  transient: ['failed', 'retry', 'retry', 'retry'],
} as const satisfies Record<string, readonly [Outcome, Outcome, Outcome, Outcome]>;
type Scenario = keyof typeof cases;
const rows = (Object.keys(cases) as Scenario[]).flatMap(event =>
  phases.map((phase, column) => ({ event, phase, outcome: cases[event][column]! })),
);

function fixture(phase: DeletionPhase, event: Scenario) {
  let raw = phase === 'idle' ? null : JSON.stringify({ mode: 'delete', owner: 'learner', phase });
  const disk = {
    getItem: async () => raw,
    setItem: async (_key: string, value: string) => {
      raw = value;
    },
    removeItem: async () => {
      raw = null;
    },
  };
  const noop = async () => {};
  const clean = jest.fn(noop);
  const session: DeletionIO['session'] = async () => {
    if (event === 'transient') throw new Error('offline');
    if (event === 'sessionExpired' || event === 'sessionMissing' || event === 'sessionSwitched')
      return event;
    return { token: 'original' };
  };
  const send = jest.fn<ReturnType<DeletionIO['send']>, Parameters<DeletionIO['send']>>(async () => {
    if (event === 'rpcLost' || event === 'rpcError') return { event, error: new Error(event) };
    return { event: 'rpcOk' };
  });
  const retryRequest =
    event === 'retry' || event === 'rpcLost' || event === 'rpcError' || event === 'rpcOk';
  const readSession = jest.fn(session);
  // Stage a transient startup read so the real Retry button drives the resend.
  if (phase !== 'idle' && retryRequest) readSession.mockRejectedValueOnce(new Error('offline'));
  const controller = createAccountTeardown(
    disk,
    {
      revokeWidgetGeneration: clean,
      notifications: noop,
      widget: noop,
      storage: noop,
      finish: noop,
    },
    { session: readSession, identity: async () => 'sessionValid', prepare: noop, send },
  );
  return { controller, disk, send, clean, retryRequest };
}

test.each(rows)(
  '$phase × $event displays $outcome and keeps reading and sign-in reachable',
  async ({ phase, event, outcome }) => {
    const { controller, disk, send, clean, retryRequest } = fixture(phase, event);
    mockLifecycle = controller;
    const read = jest.fn();
    const signIn = jest.fn();
    const ui = render(
      <AccountTeardownGate>
        <Text onPress={read}>Public reader</Text>
        <Text onPress={signIn}>Sign in</Text>
      </AccountTeardownGate>,
    );
    await ui.findByText('Public reader');
    if (phase === 'idle' && event !== 'killed' && event !== 'retry') {
      await act(async () => {
        await controller.begin('learner', 'delete').catch(() => undefined);
      });
    } else if (phase === 'idle' && event === 'retry') {
      await act(async () => {
        await controller.retry();
      });
    } else if (phase !== 'idle' && retryRequest) {
      fireEvent.press(ui.getByLabelText(STRINGS.RETRY));
    }

    const status =
      outcome === 'retry' ? 'deletionRetry' : outcome === 'failed' ? 'deletionFailed' : 'ready';
    await waitFor(() => expect(controller.snapshot()).toBe(status));
    expect(ui.queryByText(STRINGS.FAILED_TO_DELETE_ACCOUNT) !== null).toBe(outcome === 'failed');
    expect(ui.queryByText(STRINGS.DELETION_RETRY_MESSAGE) !== null).toBe(outcome === 'retry');

    if (outcome === 'retry') {
      // Even a second identical network failure leaves both entry points usable.
      if (event === 'transient' || event === 'rpcLost') {
        fireEvent.press(ui.getByLabelText(STRINGS.RETRY));
        await waitFor(() => expect(controller.snapshot()).toBe('deletionRetry'));
      }
      const record = await disk.getItem();
      expect(JSON.parse(record!)).toMatchObject({
        owner: 'learner',
        phase: phase === 'idle' ? 'requested' : phase,
      });
      expect(await controller.acceptSession('learner', false)).toBe(false);
    } else expect(await disk.getItem()).toBeNull();

    if (phase === 'confirmed' || phase === 'teardown' || event === 'sessionSwitched')
      expect(send).not.toHaveBeenCalled();
    if (phase !== 'idle' || send.mock.calls.length) expect(clean).toHaveBeenCalledWith('learner');
    else expect(clean).not.toHaveBeenCalled();
    if (phase === 'requested' && event === 'retry') expect(send).toHaveBeenCalledTimes(1);
    fireEvent.press(ui.getByText('Public reader'));
    fireEvent.press(ui.getByText('Sign in'));
    expect(read).toHaveBeenCalled();
    expect(signIn).toHaveBeenCalled();
    await act(async () => {
      expect(await controller.acceptSession('another-learner', true)).toBe(true);
    });
    expect(await disk.getItem()).toBeNull();
  },
);

test('public controls stay mounted and repeated taps share an in-flight resend', async () => {
  const { controller, send } = fixture('requested', 'rpcOk');
  mockLifecycle = controller;
  const response = Promise.withResolvers<{ event: 'rpcLost'; error: Error }>();
  send.mockImplementationOnce(() => response.promise);
  const read = jest.fn();
  const ui = render(
    <AccountTeardownGate>
      <Text onPress={read}>Public reader</Text>
      <Text>Sign in</Text>
    </AccountTeardownGate>,
  );
  const retry = await ui.findByLabelText(STRINGS.RETRY);
  fireEvent.press(retry);
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  fireEvent.press(ui.getByText('Public reader'));
  expect(read).toHaveBeenCalled();
  expect(ui.getByText('Sign in')).toBeTruthy();
  fireEvent.press(ui.getByLabelText(STRINGS.RETRY));
  const joined = controller.retry();
  await act(async () => {
    response.resolve({ event: 'rpcLost', error: new Error('lost response') });
    await expect(joined).rejects.toThrow('lost response');
  });
  expect(controller.snapshot()).toBe('deletionRetry');
  expect(send).toHaveBeenCalledTimes(1);
});
