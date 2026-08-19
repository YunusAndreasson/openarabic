import { NOTIFICATION_TYPES, SMART_NOTIFICATIONS } from '@/constants/notifications';
import type { SmartNotificationType } from '@/constants/notifications';
import { STRINGS } from '@/constants/strings';
import { MILLISECONDS_PER_DAY } from '@/utils/dateTimeUtils';

export type ReminderKind = 'due-few' | 'due-many' | 'slipping' | 'word';

/** Due counts up to this use the "few" copy bucket (matches RECOMMENDATION_DUE_FEW/MANY split) */
const DUE_FEW_MAX = 5;

/**
 * Map a planned notification to its copy bucket: small slipping batches with a
 * known word get personalized copy; otherwise counts carry the message.
 */
export function reminderKindForPlan(
  type: SmartNotificationType,
  wordCount: number,
  hasWord: boolean,
): ReminderKind {
  if (type === NOTIFICATION_TYPES.SRS_SLIPPING) {
    if (hasWord && wordCount <= SMART_NOTIFICATIONS.WORD_COPY_MAX_SLIPPING) return 'word';
    return 'slipping';
  }
  return wordCount <= DUE_FEW_MAX ? 'due-few' : 'due-many';
}

export interface ReminderCopyParams {
  count: number;
  word?: string;
}

export interface ReminderContent {
  title: string;
  body: string;
}

/**
 * Wrap an Arabic word in FSI…PDI so the RTL run stays isolated inside an LTR
 * sentence — without it, trailing punctuation ("Remember X?") can jump to the
 * wrong side of the word on the lock screen.
 */
export function isolateRtl(word: string): string {
  return `⁦${word}⁩`;
}

/**
 * Rotation pick over a non-empty pool. The modulo keeps the index in range;
 * the `?? pool[0]` fallback exists only to satisfy noUncheckedIndexedAccess.
 */
function pick<T>(pool: readonly [T, ...T[]], seed: number): T {
  return pool[seed % pool.length] ?? pool[0];
}

/**
 * Build lock-screen copy for a smart reminder.
 * Selection is a deterministic rotation over the string pools: the seed is the
 * fire date's day-of-year, and the body index is offset by one so title/body
 * pairings cycle instead of repeating together. Consecutive days never show
 * identical text, with no randomness to test around.
 */
export function buildReminderContent(
  kind: ReminderKind,
  params: ReminderCopyParams,
  seed: number,
): ReminderContent {
  const safeSeed = Math.abs(Math.trunc(seed));

  if (kind === 'word' && params.word) {
    const word = isolateRtl(params.word);
    return {
      title: pick(STRINGS.NOTIFICATION_WORD_TITLE_POOL, safeSeed)(word),
      body: pick(STRINGS.NOTIFICATION_WORD_BODY_POOL, safeSeed + 1)(
        word,
        Math.max(0, params.count - 1),
      ),
    };
  }

  if (kind === 'slipping' || kind === 'word') {
    // 'word' without a word falls back to the count-based slipping copy
    return {
      title: pick(STRINGS.NOTIFICATION_SLIPPING_TITLE_POOL, safeSeed),
      body: pick(STRINGS.NOTIFICATION_SLIPPING_BODY_POOL, safeSeed + 1)(params.count),
    };
  }

  const bodyPool =
    kind === 'due-few'
      ? STRINGS.NOTIFICATION_DUE_FEW_BODY_POOL
      : STRINGS.NOTIFICATION_DUE_MANY_BODY_POOL;
  return {
    title: pick(STRINGS.NOTIFICATION_DUE_TITLE_POOL, safeSeed),
    body: pick(bodyPool, safeSeed + 1)(params.count),
  };
}

/**
 * Day-of-year of a date — the copy-rotation seed. Purely local time so the
 * seed matches the day the notification actually fires for the user.
 */
export function dayOfYearSeed(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - startOfYear.getTime()) / MILLISECONDS_PER_DAY);
}
