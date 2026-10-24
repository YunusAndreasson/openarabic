/**
 * Notification Prompt Storage Tests
 *
 * Tests the priming-card funnel state: session counting, impression policy
 * bookkeeping, accepted flag, and the fail-safe read (a storage error must
 * yield an exhausted state so the prompt can never nag). Mirrors the
 * onboardingStorage test setup — fresh module per test via isolateModules.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockMemoryStore = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => mockMemoryStore.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  mockMemoryStore.set(key, value);
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (key: string) => mockGetItem(key),
  setItem: (key: string, value: string) => mockSetItem(key, value),
  removeItem: async (key: string) => {
    mockMemoryStore.delete(key);
  },
  multiRemove: async (keys: string[]) => {
    keys.forEach(key => mockMemoryStore.delete(key));
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

import { STORAGE_KEYS } from '@/constants/storageKeys';

type PromptStorageModule = typeof import('@/utils/notificationPromptStorage');
type AccountSwitchModule = typeof import('@/utils/accountSwitch');

function freshModule(): PromptStorageModule {
  let module: PromptStorageModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('@/utils/notificationPromptStorage') as PromptStorageModule;
  });
  if (!module) throw new Error('module failed to load');
  return module;
}

describe('notificationPromptStorage', () => {
  beforeEach(() => {
    mockMemoryStore.clear();
    // jest.config has resetMocks: true — re-install implementations
    mockGetItem.mockImplementation(async (key: string) => mockMemoryStore.get(key) ?? null);
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      mockMemoryStore.set(key, value);
    });
  });

  test('defaults: no sessions, no impressions, not accepted', async () => {
    const { loadNotificationPromptState } = freshModule();
    const state = await loadNotificationPromptState();
    expect(state.sessionsCompleted).toBe(0);
    expect(state.impressions).toBe(0);
    expect(state.accepted).toBe(false);
  });

  test('recordSessionCompleted increments and persists', async () => {
    const { loadNotificationPromptState, recordSessionCompleted } = freshModule();
    await recordSessionCompleted();
    await recordSessionCompleted();
    expect((await loadNotificationPromptState()).sessionsCompleted).toBe(2);
  });

  test('recordImpression stamps the session it happened at', async () => {
    const { loadNotificationPromptState, recordImpression, recordSessionCompleted } = freshModule();
    await recordSessionCompleted();
    await recordSessionCompleted();
    await recordSessionCompleted();
    await recordImpression();

    const state = await loadNotificationPromptState();
    expect(state.impressions).toBe(1);
    expect(state.lastImpressionSession).toBe(3);
  });

  test('recordAccepted is sticky and idempotent', async () => {
    const { loadNotificationPromptState, recordAccepted } = freshModule();
    await recordAccepted();
    const writesAfterFirst = mockSetItem.mock.calls.length;
    await recordAccepted();

    expect((await loadNotificationPromptState()).accepted).toBe(true);
    expect(mockSetItem.mock.calls.length).toBe(writesAfterFirst);
  });

  test('state round-trips across module reloads', async () => {
    const first = freshModule();
    await first.recordSessionCompleted();
    await first.recordImpression();

    const second = freshModule();
    const state = await second.loadNotificationPromptState();
    expect(state.sessionsCompleted).toBe(1);
    expect(state.impressions).toBe(1);
  });

  test('stores the same bytes it always did', async () => {
    const { recordSessionCompleted } = freshModule();
    await recordSessionCompleted();

    expect(mockMemoryStore.get(STORAGE_KEYS.NOTIFICATION_PROMPT_STATE)).toBe(
      '{"version":1,"sessionsCompleted":1,"impressions":0,"lastImpressionSession":0,"accepted":false}',
    );
  });

  test('a stored field of the wrong type reads as its default, not as stored', async () => {
    mockMemoryStore.set(
      STORAGE_KEYS.NOTIFICATION_PROMPT_STATE,
      '{"version":1,"sessionsCompleted":"3","impressions":0,"lastImpressionSession":0,"accepted":"no"}',
    );

    const state = await freshModule().loadNotificationPromptState();

    // "no" is truthy: trusted as stored, it read as accepted and the card never showed.
    expect(state.accepted).toBe(false);
    expect(state.sessionsCompleted).toBe(0);
  });

  test("an account switch does not carry the previous learner's prompt state over", async () => {
    // Regression: the module cache outlived the key, which the switch removes,
    // and the next update wrote learner A's impressions and "accepted" flag
    // under learner B.
    let prompt: PromptStorageModule | undefined;
    let accountSwitch: AccountSwitchModule | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      prompt = require('@/utils/notificationPromptStorage') as PromptStorageModule;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      accountSwitch = require('@/utils/accountSwitch') as AccountSwitchModule;
    });
    if (!prompt || !accountSwitch) throw new Error('modules failed to load');

    mockMemoryStore.set(STORAGE_KEYS.LAST_SIGNED_IN_USER, 'user-a');
    await prompt.recordSessionCompleted();
    await prompt.recordSessionCompleted();
    await prompt.recordAccepted();

    expect(await accountSwitch.claimDeviceForAccount('user-b')).toBe(true);
    await prompt.recordImpression();

    expect(JSON.parse(mockMemoryStore.get(STORAGE_KEYS.NOTIFICATION_PROMPT_STATE) ?? '{}')).toEqual(
      {
        version: 1,
        sessionsCompleted: 0,
        impressions: 1,
        lastImpressionSession: 0,
        accepted: false,
      },
    );
  });

  test('FAIL-SAFE: a read error yields an exhausted state so the prompt never shows', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage exploded'));

    const { loadNotificationPromptState } = freshModule();
    const state = await loadNotificationPromptState();

    expect(state.impressions).toBeGreaterThanOrEqual(2);
    // Fail-safe state is not persisted — a transient error retries next launch
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
