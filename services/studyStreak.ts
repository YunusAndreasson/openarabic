import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import { parseSupabaseTimestamp, toLocalDateString } from '@/utils/dateTimeUtils';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { mergeStudyDays } from '@/utils/studyDayLedger';
import { executeQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  activity: createServiceErrorConfig('study_session_activity', 'load', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    showToast: false,
  }),
};

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadingDate: Date | null;
  totalReadingDays: number;
}

export interface DailyReadingActivity {
  date: string; // YYYY-MM-DD format
  hasActivity: boolean;
}

export interface StreakPeriod {
  startDate: string;
  endDate: string;
  length: number;
  isActive: boolean;
}

export interface StreakHistoryData {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
  metrics: {
    currentStreak: number;
    longestStreak: number;
    totalReadingDays: number;
  };
}

const EMPTY_STREAK: ReadingStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadingDate: null,
  totalReadingDays: 0,
};

/**
 * Parse a `YYYY-MM-DD` day key back to LOCAL midnight.
 *
 * Not `new Date(key)` — that parses as UTC midnight, which is a different
 * calendar day everywhere west of Greenwich, so the key would not round-trip
 * through `toLocalDateString`.
 */
function parseDayKey(key: string): Date {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Is `day` the calendar day immediately after `previous`? */
function isNextDay(previous: Date, day: Date): boolean {
  const next = new Date(previous);
  next.setDate(next.getDate() + 1);
  return toLocalDateString(next) === toLocalDateString(day);
}

/**
 * Current / longest / total study days over a COMPLETE set of day keys.
 *
 * Takes the whole history, never a window. The previous implementation derived
 * these numbers from the same fixed-length array the chart draws (30 days for
 * the practice card, 40 for the streak sheet), so a streak longer than the
 * window was silently truncated to the window size — a live 184-day streak
 * rendered as "29" on the card and "39" one tap away in the sheet, because the
 * two surfaces happened to ask for different window lengths. The window is a
 * property of the chart, not of the streak.
 *
 * Day arithmetic goes through `setDate` + `toLocalDateString` rather than
 * millisecond differences: a local day is 23 or 25 hours across a DST
 * transition, so `diff === ONE_DAY_MS` drops a day twice a year.
 */
function calculateStreakFromDayKeys(dayKeys: Set<string>): ReadingStreak {
  if (dayKeys.size === 0) return { ...EMPTY_STREAK };

  const sortedKeys = Array.from(dayKeys).sort();
  const mostRecentKey = sortedKeys.at(-1) ?? '';

  const todayKey = toLocalDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateString(yesterday);

  // Anchor on the latest day that is not in the future. A key can be ahead of
  // today's local date: a review just after midnight in Tokyo is keyed to that
  // date, and after the flight to Los Angeles "today" is the day before it —
  // anchoring on the newest key then showed a 0-day streak until the local
  // date caught up (as does a clock set ahead and back). Keys are YYYY-MM-DD,
  // so string order is date order.
  const anchorKey = sortedKeys.filter(key => key <= todayKey).pop() ?? '';

  // Yesterday still counts: the streak must not evaporate at midnight, before
  // the learner has had today to keep it alive.
  let currentStreak = 0;
  if (anchorKey === todayKey || anchorKey === yesterdayKey) {
    const cursor = parseDayKey(anchorKey);
    while (dayKeys.has(toLocalDateString(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  let longestStreak = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of sortedKeys) {
    const day = parseDayKey(key);
    run = previous && isNextDay(previous, day) ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  return {
    currentStreak,
    longestStreak,
    lastReadingDate: parseDayKey(mostRecentKey),
    totalReadingDays: dayKeys.size,
  };
}

/**
 * Build the fixed-length day-by-day array the streak chart draws.
 *
 * Exactly `days` buckets ending on today, walked as calendar days from local
 * midnight. The old version stepped from `now - (days - 1)` keeping the current
 * time of day and then filtered `reviewedAt >= startDate`, so any review on the
 * oldest day that happened earlier in the day than "now" was dropped — which is
 * why a fully saturated window reported 29 of 30 days and 39 of 40.
 */
function buildActivityWindow(dayKeys: Set<string>, days: number): DailyReadingActivity[] {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  const activity: DailyReadingActivity[] = [];
  for (let index = 0; index < days; index++) {
    const date = toLocalDateString(cursor);
    activity.push({ date, hasActivity: dayKeys.has(date) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return activity;
}
export class ReadingStreakService {
  /**
   * Calculate reading streak from daily activity data
   */
  static calculateStreak(activities: DailyReadingActivity[]): ReadingStreak {
    return calculateStreakFromDayKeys(
      new Set(activities.filter(day => day.hasActivity).map(day => day.date)),
    );
  }

  /**
   * Calculate streak periods for visualization
   */
  static calculateStreakPeriods(activities: DailyReadingActivity[]): StreakPeriod[] {
    const periods: StreakPeriod[] = [];
    const activeDays = activities.filter(day => day.hasActivity);

    if (activeDays.length === 0) return periods;

    const sortedDays = activeDays.sort((a, b) => a.date.localeCompare(b.date));
    let currentPeriod: { start: string; end: string; dates: string[] } | null = null;

    for (const day of sortedDays) {
      if (!currentPeriod) {
        currentPeriod = { start: day.date, end: day.date, dates: [day.date] };
      } else {
        if (isNextDay(parseDayKey(currentPeriod.end), parseDayKey(day.date))) {
          currentPeriod.end = day.date;
          currentPeriod.dates.push(day.date);
        } else {
          // End current period and start new one
          periods.push({
            startDate: currentPeriod.start,
            endDate: currentPeriod.end,
            length: currentPeriod.dates.length,
            isActive: false,
          });
          currentPeriod = { start: day.date, end: day.date, dates: [day.date] };
        }
      }
    }

    // Add the last period
    if (currentPeriod) {
      periods.push({
        startDate: currentPeriod.start,
        endDate: currentPeriod.end,
        length: currentPeriod.dates.length,
        isActive: false,
      });
    }

    // Mark the most recent period as active if it's current
    if (periods.length > 0) {
      const lastPeriod = periods.at(-1);
      const todayStr = toLocalDateString(new Date());

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalDateString(yesterday);

      if (lastPeriod && (lastPeriod.endDate === todayStr || lastPeriod.endDate === yesterdayStr)) {
        lastPeriod.isActive = true;
      }
    }

    return periods;
  }
}

/**
 * Study Session Streak Service
 * Tracks daily study session completion for motivating consistent practice
 */
export class StudySessionStreakService {
  /**
   * Every LOCAL calendar day the user actually reviewed a word, over their whole
   * history — the single source of truth behind both the streak numbers and the
   * chart.
   *
   * Gated on `fsrs_reps > 0`, which is the only honest "has been reviewed" test:
   * `createInitialFSRSEntry` / `createResetFSRSUpdate` stamp `fsrs_last_review`
   * at the moment a word is ADDED, on a card with `fsrs_reps: 0`. Without the
   * gate, a day spent only adding vocabulary counted as a day spent studying —
   * measured across the live database as 544 phantom study days over 498
   * accounts, inflating those users' streaks. `countReviewedToday` was fixed for
   * exactly this; the streak was not.
   *
   * The result is merged into the local append-only ledger before it is used
   * (see `utils/studyDayLedger`). On its own this set is NOT a history: every
   * review overwrites `fsrs_last_review`, so re-reviewing a word erases the day
   * it previously contributed and the derived numbers can go DOWN. The merge is
   * what makes current / longest / total monotone.
   */
  private static async fetchStudyDayKeys(userId: string): Promise<Set<string>> {
    // Paged rather than a single `.select()`: PostgREST silently truncates an
    // unbounded request at its implicit 1000-row default, which would drop a
    // heavy learner's older reviews out of the streak calculation.
    const PAGE_SIZE = 1000;
    const dayKeys = new Set<string>();

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await executeQuery(
        () =>
          supabase
            .from('study_words')
            .select('fsrs_last_review')
            .eq('user_id', userId)
            .gt('fsrs_reps', 0)
            .range(offset, offset + PAGE_SIZE - 1),
        {
          ...errorConfig.activity,
          analyticsProperties: { userId },
        },
      );

      for (const record of page ?? []) {
        const reviewedAt = parseSupabaseTimestamp(record?.fsrs_last_review);
        if (reviewedAt) dayKeys.add(toLocalDateString(reviewedAt));
      }

      if (!page || page.length < PAGE_SIZE) break;
    }

    return mergeStudyDays(dayKeys);
  }

  /**
   * Day-by-day activity for the streak chart: exactly `days` buckets ending
   * today. Display only — the streak metrics are NOT derived from this window.
   */
  static async getDailyStudySessionActivity(
    userId: string,
    days: number = 30,
  ): Promise<DailyReadingActivity[]> {
    return buildActivityWindow(await this.fetchStudyDayKeys(userId), days);
  }

  /**
   * Get study session streak info, computed over the user's full history.
   *
   * Failures propagate deliberately. This used to catch everything and return a
   * zeroed streak, which React Query then cached as a SUCCESS — so one flaky
   * request overwrote a live 43-day streak with "0", and because no error ever
   * reached the query layer its `retry` never fired and the 0 simply stayed.
   * Telling a learner their streak is gone is the single most destructive thing
   * this screen can get wrong, and a network blip is not evidence of it.
   *
   * The case the old comment worried about — "no study_words yet" — does not
   * throw: it returns no rows, and an empty day set already yields a zero
   * streak through the normal path. So the catch could only ever fire on a real
   * failure, which is exactly when zero is a lie. Letting it throw keeps the
   * last good value on screen and lets the query retry.
   */
  static async getStudySessionStreak(userId: string): Promise<ReadingStreak> {
    return calculateStreakFromDayKeys(await this.fetchStudyDayKeys(userId));
  }

  /**
   * Get complete study session streak history data for visualization.
   *
   * The metrics come from the full day set and the chart from a `days`-long
   * window of it, so this screen and the practice card report the same streak
   * however long each chooses to draw.
   */
  static async getStudySessionHistory(
    userId: string,
    days: number = 30,
  ): Promise<StreakHistoryData> {
    // Throws on failure for the same reason getStudySessionStreak does: an
    // all-blank chart with zeroed metrics is a claim about the learner's
    // history, and a failed request has nothing to say about it. The screen has
    // an error state; this should reach it.
    const dayKeys = await this.fetchStudyDayKeys(userId);
    const dailyActivity = buildActivityWindow(dayKeys, days);
    const streakPeriods = ReadingStreakService.calculateStreakPeriods(dailyActivity);
    const streak = calculateStreakFromDayKeys(dayKeys);

    return {
      dailyActivity,
      streakPeriods,
      metrics: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalReadingDays: streak.totalReadingDays,
      },
    };
  }
}

// Export type alias for study streaks (same structure as reading streaks)
export type StudyStreak = ReadingStreak;
