/**
 * useDailyWordLimit Hook Tests
 *
 * Tests daily word limit tracking and management.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

import { renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Provider } from 'react-redux';

import { useDailyWordLimit } from '@/hooks/vocabulary/useDailyWordLimit';
import { setupTestStore, type TestRootState } from '@/__tests__/helpers/testStore';

// Storage mock - must use jest.fn() outside jest.mock for proper hoisting
const mockStorage: Record<string, string> = {};

// Mock functions defined at module scope
// Signatures spelled out: a bare `jest.Mock` is `Mock<UnknownFunction>` and
// discards the implementation's own types.
let mockGetItem: jest.Mock<(key: string) => Promise<string | null>>;
let mockSetItem: jest.Mock<(key: string, value: string) => Promise<void>>;
let mockRemoveItem: jest.Mock<(key: string) => Promise<void>>;

jest.mock('@react-native-async-storage/async-storage', () => ({
  // Delegates so the jest.fn implementations can be reassigned in beforeEach
  getItem: (key: string) => mockGetItem(key),
  setItem: (key: string, value: string) => mockSetItem(key, value),
  removeItem: (key: string) => mockRemoveItem(key),
}));

const clearMockStorage = () => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
};

const resetMockFunctions = () => {
  mockGetItem = jest.fn((key: string) => Promise.resolve(mockStorage[key] || null));
  mockSetItem = jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  mockRemoveItem = jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
};

// Create test store with custom daily word limit
const createTestStore = (dailyWordLimit: number = 10) => {
  // Get the default state to merge with
  const defaultStore = setupTestStore();
  const defaultSettings = defaultStore.getState().settings;

  return setupTestStore({
    settings: {
      ...defaultSettings,
      dailyWordLimit,
    },
  });
};

describe('useDailyWordLimit', () => {
  let mockStore: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockFunctions();
    clearMockStorage();
    mockStore = createTestStore(10);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  describe('Initialization', () => {
    test('returns dailyWordLimit from Redux store', () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      // Default store is created with dailyWordLimit: 10
      expect(result.current.dailyWordLimit).toBe(10);
    });

    test('hook exposes expected interface', () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      expect(typeof result.current.dailyWordLimit).toBe('number');
      expect(typeof result.current.getDailyWordCount).toBe('function');
      expect(typeof result.current.getEffectiveLimitInfo).toBe('function');
      expect(typeof result.current.incrementDailyWordCount).toBe('function');
      expect(typeof result.current.decrementIfAddedToday).toBe('function');
      expect(typeof result.current.canAddWord).toBe('function');
      expect(typeof result.current.getRemainingWords).toBe('function');
      expect(typeof result.current.isApproachingLimit).toBe('function');
      expect(typeof result.current.resetDailyWordCount).toBe('function');
    });
  });

  describe('getDailyWordCount', () => {
    test('returns 0 for fresh day', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const count = await result.current.getDailyWordCount();
      expect(count).toBe(0);
    });

    test('returns 0 on storage errors', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const count = await result.current.getDailyWordCount();
      expect(count).toBe(0);
    });
  });

  describe('incrementDailyWordCount', () => {
    test('returns true when under limit', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const success = await result.current.incrementDailyWordCount();
      expect(success).toBeTruthy();
    });

    test('returns true when unlimited (dailyWordLimit = 0)', async () => {
      const unlimitedStore = createTestStore(0);
      const unlimitedWrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={unlimitedStore}>{children}</Provider>
      );
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper: unlimitedWrapper });
      expect(result.current.dailyWordLimit).toBe(0);

      const success = await result.current.incrementDailyWordCount();
      expect(success).toBeTruthy();
    });

    test('serializes concurrent reservations at the configured ceiling', async () => {
      const { result: first } = renderHook(() => useDailyWordLimit(), { wrapper });
      const { result: second } = renderHook(() => useDailyWordLimit(), { wrapper });

      const reservations = await Promise.all(
        Array.from({ length: 12 }, (_, index) =>
          (index % 2 === 0 ? first : second).current.incrementDailyWordCount(),
        ),
      );

      expect(reservations.filter(Boolean)).toHaveLength(10);
      expect(await first.current.getDailyWordCount()).toBe(10);
    });

    test('continues processing after a queued storage failure', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });
      mockSetItem.mockRejectedValueOnce(new Error('storage unavailable'));

      await expect(result.current.incrementDailyWordCount()).resolves.toBe(false);
      await expect(result.current.incrementDailyWordCount()).resolves.toBe(true);
      expect(await result.current.getDailyWordCount()).toBe(1);
    });
  });

  describe('canAddWord', () => {
    test('returns true when unlimited', async () => {
      const unlimitedStore = createTestStore(0);
      const unlimitedWrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={unlimitedStore}>{children}</Provider>
      );
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper: unlimitedWrapper });
      expect(result.current.dailyWordLimit).toBe(0);

      const canAdd = await result.current.canAddWord();
      expect(canAdd).toBeTruthy();
    });

    test('returns true when under limit', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const canAdd = await result.current.canAddWord();
      expect(canAdd).toBeTruthy();
    });
  });

  describe('getRemainingWords', () => {
    test('returns full limit when no words added', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const remaining = await result.current.getRemainingWords();
      expect(remaining).toBe(10);
    });
  });

  describe('isApproachingLimit', () => {
    test('returns false when unlimited', async () => {
      const unlimitedStore = createTestStore(0);
      const unlimitedWrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={unlimitedStore}>{children}</Provider>
      );
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper: unlimitedWrapper });
      expect(result.current.dailyWordLimit).toBe(0);

      const approaching = await result.current.isApproachingLimit();
      expect(approaching).toBeFalsy();
    });

    test('returns false when under 80% threshold', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const approaching = await result.current.isApproachingLimit();
      expect(approaching).toBeFalsy();
    });
  });

  describe('resetDailyWordCount', () => {
    test('clears storage without throwing', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      await expect(result.current.resetDailyWordCount()).resolves.not.toThrow();
    });

    test('handles storage errors silently', async () => {
      mockRemoveItem.mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      await expect(result.current.resetDailyWordCount()).resolves.not.toThrow();
    });
  });

  describe('decrementIfAddedToday', () => {
    // Regression: removing a word added earlier in the SAME session used to
    // leave the daily counter permanently incremented — a same-day
    // add-then-remove should net to zero words spent against today's cap.
    test('releases a slot for a word added earlier today', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      await result.current.incrementDailyWordCount();
      expect(await result.current.getDailyWordCount()).toBe(1);

      await result.current.decrementIfAddedToday(new Date().toISOString());

      expect(await result.current.getDailyWordCount()).toBe(0);
    });

    // Removing an OLDER word must never refund a slot it never used against
    // today's count — only a same-day add-then-remove nets to zero.
    test('does not release a slot for a word added on a previous day', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      await result.current.incrementDailyWordCount();
      expect(await result.current.getDailyWordCount()).toBe(1);

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await result.current.decrementIfAddedToday(yesterday);

      expect(await result.current.getDailyWordCount()).toBe(1);
    });

    test('does nothing for a null or invalid created_at', async () => {
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      await result.current.incrementDailyWordCount();
      expect(await result.current.getDailyWordCount()).toBe(1);

      await result.current.decrementIfAddedToday(null);
      await result.current.decrementIfAddedToday('not-a-real-timestamp');

      expect(await result.current.getDailyWordCount()).toBe(1);
    });
  });

  describe('adaptive new-word pacing', () => {
    const RECALL_KEY = 'recent_recall_sessions';

    const seedRecall = (known: number, unknown: number) => {
      mockStorage[RECALL_KEY] = JSON.stringify([{ known, unknown, at: 1 }]);
    };

    test('keeps the full ceiling while warming up (too little recall data)', async () => {
      seedRecall(2, 1); // only 3 trials < MIN_TRIALS
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const info = await result.current.getEffectiveLimitInfo();
      expect(info.status).toBe('warming-up');
      expect(await result.current.canAddWord()).toBe(true);
    });

    test('gives the full ceiling when recent recall is on target', async () => {
      seedRecall(24, 1); // 25 trials, 96% recall ≥ target → full
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const info = await result.current.getEffectiveLimitInfo();
      expect(info.status).toBe('full');
      expect(await result.current.canAddWord()).toBe(true);
    });

    test('pauses new words when recent recall is struggling', async () => {
      seedRecall(5, 20); // 25 trials, 20% recall → well under target → paused
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const info = await result.current.getEffectiveLimitInfo();
      expect(info.status).toBe('paused');
      expect(info.effective).toBe(0);
      expect(await result.current.canAddWord()).toBe(false);
      expect(await result.current.getRemainingWords()).toBe(0);
    });
  });
});
