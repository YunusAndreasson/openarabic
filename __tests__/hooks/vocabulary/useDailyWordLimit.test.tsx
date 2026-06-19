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
let mockGetItem: jest.Mock;
let mockSetItem: jest.Mock;
let mockRemoveItem: jest.Mock;

jest.mock('@/utils/safeAsyncStorage', () => {
  // These will be reassigned in beforeEach
  return {
    getSafeStorage: () => ({
      getItem: (...args: unknown[]) => mockGetItem(...args),
      setItem: (...args: unknown[]) => mockSetItem(...args),
      removeItem: (...args: unknown[]) => mockRemoveItem(...args),
    }),
  };
});

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

      const success = await result.current.incrementDailyWordCount();
      expect(success).toBeTruthy();
    });
  });

  describe('canAddWord', () => {
    test('returns true when unlimited', async () => {
      const unlimitedStore = createTestStore(0);
      const unlimitedWrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={unlimitedStore}>{children}</Provider>
      );
      const { result } = renderHook(() => useDailyWordLimit(), { wrapper: unlimitedWrapper });

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
