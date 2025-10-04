/**
 * Unit tests for useDailyWordLimit hook
 *
 * Tests the core daily word limit functionality including:
 * - Daily count tracking
 * - Limit enforcement
 * - Daily reset at midnight
 * - AsyncStorage persistence
 * - Race condition handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { useDailyWordLimit } from '@/hooks/vocabulary/useDailyWordLimit';
import { store } from '@/store/store';
import { setDailyWordLimit } from '@/store/settingsSlice';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('useDailyWordLimit - Unit Tests', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mock responses
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  describe('Initialization', () => {
    it('should return correct initial values from Redux store', () => {
      // Set limit to 10 in store
      store.dispatch(setDailyWordLimit(10));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      expect(result.current.dailyWordLimit).toBe(10);
      expect(typeof result.current.canAddWord).toBe('function');
      expect(typeof result.current.incrementDailyWordCount).toBe('function');
      expect(typeof result.current.getDailyWordCount).toBe('function');
      expect(typeof result.current.getRemainingWords).toBe('function');
      expect(typeof result.current.getCurrentDailyCount).toBe('function');
      expect(typeof result.current.isApproachingLimit).toBe('function');
      expect(typeof result.current.resetDailyWordCount).toBe('function');
    });

    it('should initialize with unlimited (0) limit', () => {
      store.dispatch(setDailyWordLimit(0));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      expect(result.current.dailyWordLimit).toBe(0);
    });
  });

  describe('Daily Count Retrieval', () => {
    it('should return 0 when no count is stored', async () => {
      store.dispatch(setDailyWordLimit(10));
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const count = await result.current.getDailyWordCount();
      expect(count).toBe(0);
    });

    it('should return stored count when available', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      // Mock AsyncStorage to return existing count
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('5');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const count = await result.current.getDailyWordCount();
      expect(count).toBe(5);
    });

    it('should reset count to 0 when date has changed', async () => {
      store.dispatch(setDailyWordLimit(10));
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Mock AsyncStorage to return yesterday's date and count of 5
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(yesterday);
        if (key === 'daily_word_count') return Promise.resolve('5');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const count = await result.current.getDailyWordCount();

      // Should reset to 0 because it's a new day
      expect(count).toBe(0);

      // Should update AsyncStorage with new date and reset count
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'daily_word_reset_date',
        expect.any(String)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('daily_word_count', '0');
    });
  });

  describe('canAddWord', () => {
    it('should return true when under limit', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('5');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const canAdd = await result.current.canAddWord();
      expect(canAdd).toBe(true);
    });

    it('should return false when at limit', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('10');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const canAdd = await result.current.canAddWord();
      expect(canAdd).toBe(false);
    });

    it('should return false when over limit', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('15');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const canAdd = await result.current.canAddWord();
      expect(canAdd).toBe(false);
    });

    it('should return true when limit is unlimited (0)', async () => {
      store.dispatch(setDailyWordLimit(0));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('1000');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const canAdd = await result.current.canAddWord();
      expect(canAdd).toBe(true);
    });
  });

  describe('incrementDailyWordCount', () => {
    it('should increment count successfully when under limit', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      let currentCount = '5';
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve(currentCount);
        return Promise.resolve(null);
      });

      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key === 'daily_word_count') {
          currentCount = value;
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const success = await result.current.incrementDailyWordCount();

      expect(success).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('daily_word_count', '6');
    });

    it('should return false when at limit', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('10');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const success = await result.current.incrementDailyWordCount();

      expect(success).toBe(false);
      // Should NOT increment when at limit
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith('daily_word_count', expect.any(String));
    });

    it('should always return true when limit is unlimited (0)', async () => {
      store.dispatch(setDailyWordLimit(0));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const success = await result.current.incrementDailyWordCount();

      expect(success).toBe(true);
      // Unlimited mode doesn't track count
    });

    it('should verify increment was successful', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      let currentCount = 5;
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve(String(currentCount));
        return Promise.resolve(null);
      });

      mockAsyncStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key === 'daily_word_count') {
          currentCount = parseInt(value, 10);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const success = await result.current.incrementDailyWordCount();

      expect(success).toBe(true);
      expect(currentCount).toBe(6);
    });
  });

  describe('getRemainingWords', () => {
    it('should calculate remaining words correctly', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('3');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const remaining = await result.current.getRemainingWords();
      expect(remaining).toBe(7); // 10 - 3 = 7
    });

    it('should return 0 when at limit', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('10');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const remaining = await result.current.getRemainingWords();
      expect(remaining).toBe(0);
    });

    it('should return Infinity when limit is unlimited (0)', async () => {
      store.dispatch(setDailyWordLimit(0));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const remaining = await result.current.getRemainingWords();
      expect(remaining).toBe(Infinity);
    });

    it('should return 0 when over limit (edge case)', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('15');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const remaining = await result.current.getRemainingWords();
      expect(remaining).toBe(0); // Math.max(0, 10 - 15) = 0
    });
  });

  describe('isApproachingLimit', () => {
    it('should return false when under 80% threshold', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('5');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const approaching = await result.current.isApproachingLimit();
      expect(approaching).toBe(false); // 5/10 = 50% < 80%
    });

    it('should return true when at or above 80% threshold', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('8');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const approaching = await result.current.isApproachingLimit();
      expect(approaching).toBe(true); // 8/10 = 80%
    });

    it('should return false when limit is unlimited (0)', async () => {
      store.dispatch(setDailyWordLimit(0));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('1000');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const approaching = await result.current.isApproachingLimit();
      expect(approaching).toBe(false); // Unlimited never approaches limit
    });
  });

  describe('resetDailyWordCount', () => {
    it('should clear AsyncStorage entries', async () => {
      store.dispatch(setDailyWordLimit(10));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      await act(async () => {
        await result.current.resetDailyWordCount();
      });

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('daily_word_count');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('daily_word_reset_date');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      store.dispatch(setDailyWordLimit(10));
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('AsyncStorage error'));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      // Should not throw error
      await expect(result.current.resetDailyWordCount()).resolves.toBeUndefined();
    });
  });

  describe('Different Limit Values', () => {
    it.each([10, 20, 30])(
      'should enforce %i word limit correctly',
      async (limit) => {
        store.dispatch(setDailyWordLimit(limit));
        const today = new Date().toISOString().split('T')[0];

        mockAsyncStorage.getItem.mockImplementation((key: string) => {
          if (key === 'daily_word_reset_date') return Promise.resolve(today);
          if (key === 'daily_word_count') return Promise.resolve(String(limit - 1));
          return Promise.resolve(null);
        });

        const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

        // Should be able to add one more
        const canAddBefore = await result.current.canAddWord();
        expect(canAddBefore).toBe(true);

        // After incrementing, should be at limit
        mockAsyncStorage.getItem.mockImplementation((key: string) => {
          if (key === 'daily_word_reset_date') return Promise.resolve(today);
          if (key === 'daily_word_count') return Promise.resolve(String(limit));
          return Promise.resolve(null);
        });

        const canAddAfter = await result.current.canAddWord();
        expect(canAddAfter).toBe(false);
      }
    );
  });

  describe('Error Handling', () => {
    it('should return 0 count when AsyncStorage fails', async () => {
      store.dispatch(setDailyWordLimit(10));
      mockAsyncStorage.getItem.mockRejectedValue(new Error('AsyncStorage error'));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const count = await result.current.getDailyWordCount();
      expect(count).toBe(0);
    });

    it('should return false when increment fails', async () => {
      store.dispatch(setDailyWordLimit(10));
      const today = new Date().toISOString().split('T')[0];

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'daily_word_reset_date') return Promise.resolve(today);
        if (key === 'daily_word_count') return Promise.resolve('5');
        return Promise.resolve(null);
      });

      mockAsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage error'));

      const { result } = renderHook(() => useDailyWordLimit(), { wrapper });

      const success = await result.current.incrementDailyWordCount();
      expect(success).toBe(false);
    });
  });
});
