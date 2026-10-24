import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import { OPTIMIZED_FSRS_CONFIG } from '@/constants/fsrs';
import { useAppSelectorShallow } from '@/store/hooks';
import { selectAdaptiveNewWordPacingEnabled, selectDailyWordLimit } from '@/store/settingsSlice';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { parseSupabaseTimestamp, toLocalDateString } from '@/utils/dateTimeUtils';
import { computeAdaptiveNewLimit, type AdaptiveNewLimit } from '@/utils/newWordPacing';
import { readRecentRecall } from '@/utils/recallSignalStorage';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const DAILY_WORD_COUNT_KEY = STORAGE_KEYS.DAILY_WORD_COUNT;
const DAILY_WORD_RESET_KEY = STORAGE_KEYS.DAILY_WORD_RESET_DATE;

// AsyncStorage has no compare-and-swap operation. Keep every read/modify/write
// of the shared quota behind one module-level queue so separate hook instances
// cannot reserve or release the same slot concurrently.
const enqueueDailyCountOperation = createSerialQueue();

async function getDailyWordCountUnlocked(currentDate: string): Promise<number> {
  const lastResetDate = await AsyncStorage.getItem(DAILY_WORD_RESET_KEY);

  if (lastResetDate !== currentDate) {
    await AsyncStorage.setItem(DAILY_WORD_RESET_KEY, currentDate);
    await AsyncStorage.setItem(DAILY_WORD_COUNT_KEY, '0');
    return 0;
  }

  const count = await AsyncStorage.getItem(DAILY_WORD_COUNT_KEY);
  return parseInt(count || '0', 10);
}

export const useDailyWordLimit = () => {
  const dailyWordLimit = useAppSelectorShallow(selectDailyWordLimit);
  const adaptivePacingEnabled = useAppSelectorShallow(selectAdaptiveNewWordPacingEnabled);

  // The day boundary MUST be the same one countReviewedToday and the streak
  // service use — see toLocalDateString for what went wrong when it wasn't.
  const getCurrentDateString = useCallback(() => toLocalDateString(new Date()), []);

  const getDailyWordCount = useCallback(async (): Promise<number> => {
    try {
      return await enqueueDailyCountOperation(() =>
        getDailyWordCountUnlocked(getCurrentDateString()),
      );
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

      return await enqueueDailyCountOperation(async () => {
        const currentCount = await getDailyWordCountUnlocked(getCurrentDateString());

        // Check and reserve in the same serialized operation.
        // `effective === 0` (paused) naturally blocks here.
        if (currentCount >= effective) return false;

        await AsyncStorage.setItem(DAILY_WORD_COUNT_KEY, String(currentCount + 1));
        return true;
      });
    } catch {
      return false;
    }
  }, [getEffectiveLimitInfo, getCurrentDateString]);

  /** Release a slot reserved by incrementDailyWordCount when the add fails. */
  const decrementDailyWordCount = useCallback(async (): Promise<void> => {
    try {
      const { effective } = await getEffectiveLimitInfo();
      // Unlimited mode never persists a reservation.
      if (effective === Infinity) return;

      await enqueueDailyCountOperation(async () => {
        const currentCount = await getDailyWordCountUnlocked(getCurrentDateString());
        await AsyncStorage.setItem(DAILY_WORD_COUNT_KEY, String(Math.max(0, currentCount - 1)));
      });
    } catch {
      // A failed cleanup must not hide the original mutation error.
    }
  }, [getEffectiveLimitInfo, getCurrentDateString]);

  /**
   * Release today's reserved quota slot ONLY if `createdAt` falls on today's
   * local calendar day. A same-day add-then-remove nets out to zero words
   * spent against the cap; removing a word added on an earlier day must never
   * refund a slot it never used.
   */
  const decrementIfAddedToday = useCallback(
    async (createdAt: string | null | undefined): Promise<void> => {
      const created = parseSupabaseTimestamp(createdAt);
      if (!created) return;

      if (toLocalDateString(created) !== getCurrentDateString()) return;

      await decrementDailyWordCount();
    },
    [getCurrentDateString, decrementDailyWordCount],
  );

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
      await enqueueDailyCountOperation(async () => {
        await AsyncStorage.removeItem(DAILY_WORD_COUNT_KEY);
        await AsyncStorage.removeItem(DAILY_WORD_RESET_KEY);
      });
    } catch {
      // Reset failed - continue silently
    }
  }, []);

  return {
    dailyWordLimit,
    getDailyWordCount,
    getEffectiveLimitInfo,
    incrementDailyWordCount,
    decrementDailyWordCount,
    decrementIfAddedToday,
    canAddWord,
    getRemainingWords,
    isApproachingLimit,
    resetDailyWordCount,
  };
};
