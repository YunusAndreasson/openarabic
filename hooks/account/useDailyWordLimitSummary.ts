import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { STRINGS } from '@/constants/strings';
import { useDailyWordLimit } from '@/hooks/vocabulary';

/**
 * The one-line standing under the "New words per day" row.
 *
 * It reads `getEffectiveLimitInfo()` rather than `getRemainingWords()` because
 * the two disagree in the case that matters: when smart pacing has throttled
 * intake to zero, the remaining count is also zero, and the row used to say
 * "0 new words remaining today" — true, but silent about the reason, and
 * indistinguishable from having simply used the day's allowance up.
 *
 * Returns `null` when there is nothing worth saying (an unlimited allowance),
 * so the row falls back to no subtitle at all.
 */
export const useDailyWordLimitSummary = (): string | null => {
  const { getEffectiveLimitInfo, getDailyWordCount } = useDailyWordLimit();
  const [summary, setSummary] = useState<string | null>(null);

  // Refetch every time this screen gains focus, not just on mount — the count
  // changes from other screens (article reader, dictionary list, practice
  // empty-state quick-start) while Account may stay mounted in the background
  // tab stack, so a mount-only fetch could show a stale figure.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchSummary = async () => {
        const { effective, status } = await getEffectiveLimitInfo();

        if (status === 'paused') {
          if (!cancelled) setSummary(STRINGS.DAILY_LIMIT_PAUSED_SHORT);
          return;
        }

        // Unlimited: the row's right-hand value already says so.
        if (effective === Infinity) {
          if (!cancelled) setSummary(null);
          return;
        }

        const used = await getDailyWordCount();
        const remaining = Math.max(0, effective - used);
        if (!cancelled) {
          setSummary(STRINGS.DAILY_LIMIT_LEFT_TODAY.replace('{count}', String(remaining)));
        }
      };

      void fetchSummary();

      return () => {
        cancelled = true;
      };
    }, [getEffectiveLimitInfo, getDailyWordCount]),
  );

  return summary;
};
