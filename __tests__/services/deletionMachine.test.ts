import { deletionTransition, type DeletionPhase } from '@/services/deletionMachine';

type Event = Parameters<typeof deletionTransition>[1];
type Step = ReturnType<typeof deletionTransition>;
const phases: DeletionPhase[] = ['idle', 'requested', 'confirmed', 'teardown'];
const unchanged = phases.map(p => [p, 'none'] as const);
const [idle, requested, confirmed, teardown] = unchanged as [Step, Step, Step, Step];
const fail = ['idle', 'failure'] as const;
const done = ['idle', 'done'] as const;
const confirm = ['confirmed', 'checkOwner'] as const;
const clean = ['teardown', 'endSession'] as const;
const check = ['teardown', 'checkOwner'] as const;
const retryable = ['requested', 'retryable'] as const;

// Independent transition oracle. Stale RPC completions and duplicate lifecycle
// events cannot synthesize a deletion or restart one after cleanup.
const table = {
  dispatch: [['requested', 'send'], requested, confirmed, teardown],
  rpcOk: [idle, confirm, confirmed, teardown],
  rpcLost: [idle, retryable, confirmed, teardown],
  rpcError: [idle, fail, confirmed, teardown],
  sessionValid: [idle, fail, confirmed, teardown],
  sessionMissing: [fail, confirm, clean, clean],
  sessionExpired: [fail, confirm, clean, clean],
  sessionSwitched: [fail, fail, done, done],
  restart: [idle, ['requested', 'reconcile'], confirm, check],
  retry: [idle, ['requested', 'resend'], confirm, check],
  startCleanup: [idle, requested, clean, clean],
  cleaned: [idle, requested, confirmed, done],
  transient: [fail, retryable, ['confirmed', 'retryable'], ['teardown', 'retryable']],
} as const satisfies Record<Event, readonly [Step, Step, Step, Step]>;

test.each(
  (Object.keys(table) as Event[]).flatMap(event =>
    phases.map((phase, column) => ({ phase, event, expected: table[event][column] })),
  ),
)('$phase × $event', ({ phase, event, expected }) => {
  expect(deletionTransition(phase, event)).toEqual(expected);
});
