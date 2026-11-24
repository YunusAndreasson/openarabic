import { expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createAccountTeardown } from '@/services/accountTeardown';
import { AccountTeardownGate } from '@/components/providers/AccountTeardownGate';
import { STORAGE_KEYS } from '@/constants/storageKeys';

jest.mock('expo-splash-screen', () => ({ hide: jest.fn() }));
jest.mock('@/services/accountLifecycle', () => ({
  get accountTeardown() {
    return mockLifecycle;
  },
}));
let mockLifecycle: ReturnType<typeof createAccountTeardown>;

test('cold sign-out cannot mount private providers during replay or a failed OS cleanup', async () => {
  const disk = new Map([
    [String(STORAGE_KEYS.ACCOUNT_TEARDOWN), JSON.stringify({ owner: 'previous', mode: 'signOut' })],
  ]);
  const blocked = Promise.withResolvers<void>();
  const widget = jest
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error('host unavailable'))
    .mockResolvedValue(undefined);
  mockLifecycle = createAccountTeardown(
    {
      getItem: async k => disk.get(k) ?? null,
      setItem: async (k, v) => {
        disk.set(k, v);
      },
      removeItem: async k => {
        disk.delete(k);
      },
    },
    {
      revokeWidgetGeneration: () => undefined,
      notifications: () => blocked.promise,
      widget,
      storage: async () => {},
      finish: async () => {},
    },
    {
      session: async () => 'sessionMissing',
      identity: async () => 'sessionExpired',
      prepare: async () => {},
      send: async () => {
        throw new Error('Unexpected deletion request');
      },
    },
  );
  const mounted = jest.fn();
  function Reader() {
    mounted();
    return <Text>Reader</Text>;
  }
  render(
    <AccountTeardownGate>
      <Reader />
    </AccountTeardownGate>,
  );
  expect(mounted).not.toHaveBeenCalled();
  await act(async () => blocked.resolve());
  const retry = await screen.findByLabelText('Retry');
  expect(disk.size).toBe(1);
  expect(mounted).not.toHaveBeenCalled();
  fireEvent.press(retry);
  await waitFor(() => expect(mounted).toHaveBeenCalled());
  expect(disk.size).toBe(0);
});
