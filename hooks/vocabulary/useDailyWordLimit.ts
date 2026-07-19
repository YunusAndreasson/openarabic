import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import { OPTIMIZED_FSRS_CONFIG } from '@/constants/fsrs';
import { useAppSelectorShallow } from '@/store/hooks';
import { computeAdaptiveNewLimit, type AdaptiveNewLimit } from '@/utils/newWordPacing';
import { readRecentRecall } from '@/utils/recallSignalStorage';

const DAILY_WORD_COUNT_KEY = 'daily_word_count';
const DAILY_WORD_RESET_KEY = 'daily_word_reset_date';

export const useDailyWordLimit = () => {
  const dailyWordLimit = useAppSelectorShallow(state => state.settings.dailyWordLimit);
  const adaptivePacingEnabled = useAppSelectorShallow(
    state => state.settings.adaptiveNewWordPacingEnabled,
  );

  const getCurrentDateString = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
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

  /**
   * Resolve today's effective new-word ceiling. With adaptive pacing on, the
   * configured limit is eased by recent recall (down to 0 = paused when recall
   * is struggling); with it off, the raw setting is used unchanged.
   *
   * Representation: `Infinity` = unlimited, `0` = paused, finite = the cap.
   * The app's `dailyWordLimit === 0` ("unlimited") maps to `Infinity` here.
   */
  const getEffectiveLimitInfo = useCallback(async (): Promise<AdaptiveNewLimit> => {
    const ceiling = dailyWordLimit === 0 ? Infinity : dailyWordLimit;

    if (!adaptivePacingEnabled) {
      return {
        effective: ceiling,
        ceiling,
        status: ceiling === Infinity ? 'unlimited' : 'full',
      };
    }

    const recall = await readRecentRecall();
    return computeAdaptiveNewLimit({
      ceiling,
      recall,
      desiredRetention: OPTIMIZED_FSRS_CONFIG.request_retention,
    });
  }, [dailyWordLimit, adaptivePacingEnabled]);

  const incrementDailyWordCount = useCallback(async (): Promise<boolean> => {
    try {
      const { effective } = await getEffectiveLimitInfo();

      // Unlimited → always allow.
      if (effective === Infinity) {
        return true;
      }

      const currentCount = await getDailyWordCount();

      // Check if the (possibly throttled) limit would be exceeded.
      // `effective === 0` (paused) naturally blocks here.
      if (currentCount >= effective) {
        return false;
      }

      // Increment count - NOTE: Race condition is acceptable for this use case
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
  }, [getEffectiveLimitInfo, getDailyWordCount]);

  const canAddWord = useCallback(async (): Promise<boolean> => {
    const { effective } = await getEffectiveLimitInfo();
    if (effective === Infinity) return true;

    const currentCount = await getDailyWordCount();
    return currentCount < effective;
  }, [getEffectiveLimitInfo, getDailyWordCount]);

  const getRemainingWords = useCallback(async (): Promise<number> => {
    const { effective } = await getEffectiveLimitInfo();
    if (effective === Infinity) return Infinity;

    const currentCount = await getDailyWordCount();
    return Math.max(0, effective - currentCount);
  }, [getEffectiveLimitInfo, getDailyWordCount]);

  // Check if user is approaching their daily limit (80% threshold)
  const isApproachingLimit = useCallback(async (): Promise<boolean> => {
    const { effective } = await getEffectiveLimitInfo();
    if (effective === Infinity) return false;

    const currentCount = await getDailyWordCount();
    const threshold = Math.floor(effective * 0.8);
    return currentCount >= threshold;
  }, [getEffectiveLimitInfo, getDailyWordCount]);

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
    getEffectiveLimitInfo,
    incrementDailyWordCount,
    canAddWord,
    getRemainingWords,
    isApproachingLimit,
    resetDailyWordCount,
  };
};
