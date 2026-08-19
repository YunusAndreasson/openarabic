/**
 * Onboarding Storage Tests
 *
 * Tests the JSON-blob persistence, idempotent step marking, fail-safe
 * error behavior, and listener notification of utils/onboardingStorage.ts.
 * The module keeps an in-memory cache, so each test imports a fresh copy
 * via jest.isolateModules.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { ONBOARDING_STORAGE_KEY, OnboardingStep } from '@/constants/onboarding';

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

type OnboardingStorageModule = typeof import('@/utils/onboardingStorage');

function freshModule(): OnboardingStorageModule {
  let module: OnboardingStorageModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('@/utils/onboardingStorage') as OnboardingStorageModule;
  });
  if (!module) throw new Error('module failed to load');
  return module;
}

describe('onboardingStorage', () => {
  beforeEach(() => {
    mockMemoryStore.clear();
    // jest.config has resetMocks: true, which strips implementations before
    // each test — re-install both here
    mockGetItem.mockImplementation(async (key: string) => mockMemoryStore.get(key) ?? null);
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      mockMemoryStore.set(key, value);
    });
  });

  test('loadOnboardingState returns fresh defaults when nothing is stored', async () => {
    const { loadOnboardingState } = freshModule();
    const state = await loadOnboardingState();
    expect(state.dismissed).toBe(false);
    expect(state.initializedAt).toBeUndefined();
    expect(state.readFirstText).toBe(false);
    expect(state.saveFirstWord).toBe(false);
    expect(state.listenToAudio).toBe(false);
  });

  test('markOnboardingStep persists the step and is idempotent', async () => {
    const { loadOnboardingState, markOnboardingStep } = freshModule();
    await markOnboardingStep(OnboardingStep.READ_TEXT);
    await markOnboardingStep(OnboardingStep.READ_TEXT);
    expect(mockSetItem).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(mockMemoryStore.get(ONBOARDING_STORAGE_KEY) ?? '{}');
    expect(stored.readFirstText).toBe(true);
    expect(stored.saveFirstWord).toBe(false);
    expect((await loadOnboardingState()).readFirstText).toBe(true);
  });

  test('state round-trips across module reloads', async () => {
    const first = freshModule();
    await first.markOnboardingStep(OnboardingStep.SAVE_WORD);
    await first.initializeOnboarding({ dismissed: false });

    const second = freshModule();
    const state = await second.loadOnboardingState();
    expect(state.saveFirstWord).toBe(true);
    expect(state.dismissed).toBe(false);
    expect(state.initializedAt).toEqual(expect.any(String));
  });

  test('keeps onboarding progress isolated between accounts', async () => {
    const module = freshModule();
    module.setOnboardingStorageUser('user-a');
    await module.markOnboardingStep(OnboardingStep.READ_TEXT);

    module.setOnboardingStorageUser('user-b');
    expect((await module.loadOnboardingState()).readFirstText).toBe(false);
    await module.markOnboardingStep(OnboardingStep.SAVE_WORD);

    module.setOnboardingStorageUser('user-a');
    const firstUser = await module.loadOnboardingState();
    expect(firstUser.readFirstText).toBe(true);
    expect(firstUser.saveFirstWord).toBe(false);
  });

  test('keeps every concurrently completed step', async () => {
    const module = freshModule();

    await Promise.all([
      module.markOnboardingStep(OnboardingStep.READ_TEXT),
      module.markOnboardingStep(OnboardingStep.LISTEN_AUDIO),
    ]);

    const state = await module.loadOnboardingState();
    expect(state.readFirstText).toBe(true);
    expect(state.listenToAudio).toBe(true);
  });

  test('does not commit a delayed operation after the active account changes', async () => {
    let resolveRead: ((value: string | null) => void) | undefined;
    mockGetItem.mockImplementationOnce(
      () =>
        new Promise<string | null>(resolve => {
          resolveRead = resolve;
        }),
    );

    const module = freshModule();
    module.setOnboardingStorageUser('user-a');
    const delayedMark = module.markOnboardingStep(OnboardingStep.READ_TEXT);
    await Promise.resolve();

    module.setOnboardingStorageUser('user-b');
    resolveRead?.(null);
    await delayedMark;

    expect(mockMemoryStore.has(`${ONBOARDING_STORAGE_KEY}:user-b`)).toBe(false);
    expect(module.getCachedOnboardingState()).toBeNull();
    expect((await module.loadOnboardingState()).readFirstText).toBe(false);
  });

  test('fail-safe: read error yields a dismissed, initialized state without persisting', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage broken'));
    const { loadOnboardingState } = freshModule();
    const state = await loadOnboardingState();
    expect(state.dismissed).toBe(true);
    expect(state.initializedAt).toEqual(expect.any(String));
    // Not persisted — a transient error is retried next launch
    expect(mockMemoryStore.has(ONBOARDING_STORAGE_KEY)).toBe(false);
  });

  test('resetOnboarding writes a fresh enabled state', async () => {
    const module = freshModule();
    await module.markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
    await module.markChecklistCompleted();
    await module.resetOnboarding();

    const state = await module.loadOnboardingState();
    expect(state.dismissed).toBe(false);
    expect(state.listenToAudio).toBe(false);
    expect(state.completedAt).toBeUndefined();
    expect(state.initializedAt).toEqual(expect.any(String));
  });

  test('markChecklistCompleted is idempotent and keeps the first timestamp', async () => {
    const module = freshModule();
    await module.markChecklistCompleted();
    const first = (await module.loadOnboardingState()).completedAt;
    await module.markChecklistCompleted();
    expect((await module.loadOnboardingState()).completedAt).toBe(first);
  });

  test('subscribers are notified on writes', async () => {
    const module = freshModule();
    const listener = jest.fn();
    module.subscribeOnboarding(listener);
    await module.markOnboardingStep(OnboardingStep.READ_TEXT);
    expect(listener).toHaveBeenCalled();
    expect(module.getCachedOnboardingState()?.readFirstText).toBe(true);
  });
});
