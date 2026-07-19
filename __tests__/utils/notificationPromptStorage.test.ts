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
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

type PromptStorageModule = typeof import('@/utils/notificationPromptStorage');

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

  test('FAIL-SAFE: a read error yields an exhausted state so the prompt never shows', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage exploded'));

    const { loadNotificationPromptState } = freshModule();
    const state = await loadNotificationPromptState();

    expect(state.impressions).toBeGreaterThanOrEqual(2);
    // Fail-safe state is not persisted — a transient error retries next launch
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
