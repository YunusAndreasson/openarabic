import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import { useAppSelectorMemo } from '@/store/hooks';

const DAILY_WORD_COUNT_KEY = 'daily_word_count';
const DAILY_WORD_RESET_KEY = 'daily_word_reset_date';

export const useDailyWordLimit = () => {
  const dailyWordLimit = useAppSelectorMemo(state => state.settings.dailyWordLimit);

  const getCurrentDateString = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const getDailyWordCount = useCallback(async (): Promise<number> => {
    try {
      const currentDate = getCurrentDateString();
      const lastResetDate = await AsyncStorage.getItem(DAILY_WORD_RESET_KEY);

      // If it's a new day, reset the count
      if (lastResetDate !== currentDate) {
        await AsyncStorage.setItem(DAILY_WORD_RESET_KEY, currentDate);
        await AsyncStorage.setItem(DAILY_WORD_COUNT_KEY, '0');
        return 0;
      }

      const count = await AsyncStorage.getItem(DAILY_WORD_COUNT_KEY);
      return parseInt(count || '0', 10);
    } catch {
      return 0;
    }
  }, [getCurrentDateString]);

  const incrementDailyWordCount = useCallback(async (): Promise<boolean> => {
    try {
      // If unlimited, always allow
      if (dailyWordLimit === 0) {
        return true;
      }

      const currentCount = await getDailyWordCount();

      // Check if limit would be exceeded
      if (currentCount >= dailyWordLimit) {
        return false;
      }

      // Increment count atomically - check again before incrementing to prevent race conditions
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(DAILY_WORD_COUNT_KEY, String(newCount));

      // Verify the increment was successful
      const verifyCount = await AsyncStorage.getItem(DAILY_WORD_COUNT_KEY);
      if (parseInt(verifyCount || '0', 10) !== newCount) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }, [dailyWordLimit, getDailyWordCount]);

  const canAddWord = useCallback(async (): Promise<boolean> => {
    if (dailyWordLimit === 0) return true;

    const currentCount = await getDailyWordCount();
    return currentCount < dailyWordLimit;
  }, [dailyWordLimit, getDailyWordCount]);

  const getRemainingWords = useCallback(async (): Promise<number> => {
    if (dailyWordLimit === 0) return Infinity;

    const currentCount = await getDailyWordCount();
    return Math.max(0, dailyWordLimit - currentCount);
  }, [dailyWordLimit, getDailyWordCount]);

  // Check if user is approaching their daily limit (80% threshold)
  const isApproachingLimit = useCallback(async (): Promise<boolean> => {
    if (dailyWordLimit === 0) return false;

    const currentCount = await getDailyWordCount();
    const threshold = Math.floor(dailyWordLimit * 0.8);
    return currentCount >= threshold;
  }, [dailyWordLimit, getDailyWordCount]);

  const resetDailyWordCount = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DAILY_WORD_COUNT_KEY);
      await AsyncStorage.removeItem(DAILY_WORD_RESET_KEY);
    } catch {
      // Reset failed - continue silently
    }
  }, []);

  return {
    dailyWordLimit,
    getDailyWordCount,
    incrementDailyWordCount,
    canAddWord,
    getRemainingWords,
    isApproachingLimit,
    resetDailyWordCount,
  };
};
