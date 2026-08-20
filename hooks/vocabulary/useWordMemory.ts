import { useMemo } from 'react';
import { Rating } from 'ts-fsrs';

import { OPTIMIZED_FSRS_CONFIG } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { MILLISECONDS_PER_DAY, parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { convertToFSRSCard } from '@/utils/fsrsCard';
import { FSRS_INSTANCE, calculateRetrievability } from '@/utils/fsrsUtils';
import {
  MEMORY_STAGE_LABELS,
  formatHorizon,
  getMemoryHorizonDays,
  getMemoryStage,
  type MemoryStage,
} from '@/utils/memoryHorizon';

/** Points sampled along the curve. Enough to read as a curve, cheap to build. */
const CURVE_SAMPLES = 48;

/**
 * How much further than the scheduled review the plot runs.
 *
 * Chosen so the review marker lands around 60% of the width: far enough in that
 * the decay leading up to it is readable, with enough beyond it to show where
 * recall keeps falling if the review is skipped.
 *
 * The obvious alternative — run to a fixed recall floor like 40% — is unusable.
 * FSRS decay is a power law with a very long tail: reaching 40% takes roughly 22
 * times the stability, so a word due in a month would be plotted across two
 * years and its entire story would be crushed into the leftmost 4% of the chart.
 */
const SPAN_MULTIPLIER = 1.6;

/** Breathing room under the lowest point so the curve doesn't sit on the floor. */
const FLOOR_PADDING = 0.02;

export interface MemoryCurvePoint {
  /** Days since the last review. */
  days: number;
  /** Predicted recall at that moment, 0–1. */
  retrievability: number;
}

export interface MemoryCurve {
  points: MemoryCurvePoint[];
  /** Domain width in days — index 0 of the curve is the last review. */
  spanDays: number;
  /** Where "now" falls in that domain. */
  nowDays: number;
  /** Where the scheduled review falls, or null if it is off the plot. */
  dueDays: number | null;
  /** The scheduler's target recall (0–1) — drawn as the reference line. */
  targetRetrievability: number;
  /** Floor of the y axis (0–1). */
  floorRetrievability: number;
}

export interface WordMemory {
  stage: MemoryStage;
  /** Days this word currently holds, or null when it has never been practised. */
  horizonDays: number | null;
  /**
   * Stage and horizon in one line — "Familiar · holds for 3 weeks".
   *
   * Computed here rather than at each call site so the word screen's panel and
   * the reader's word sheet say it in exactly the same words. Two `.replace()`
   * chains written twice is how two surfaces come to describe one word
   * differently.
   */
  summaryLabel: string;
  /** Predicted recall right now as a whole percent, or null without a curve. */
  recallNow: number | null;
  /** What a successful recall would grow the horizon to, e.g. "2 months". */
  nextHorizonLabel: string | null;
  reps: number;
  lapses: number;
  /** Null when the word has never been practised — there is no curve to draw. */
  curve: MemoryCurve | null;
}

/**
 * Everything the word detail screen's Memory panel needs, derived from the FSRS
 * state already on the row.
 *
 * There is no `review_logs` table, so nothing backward-looking can be shown. What
 * this returns instead is the *forward* view the scheduler is actually working
 * from: the decay curve the word is on, where today sits on it, where the next
 * review lands, and what passing that review would buy. All of it comes out of
 * the same ts-fsrs instance the review screen grades through, so the preview and
 * the real schedule cannot disagree.
 */
export function useWordMemory(word: StudyWord | undefined): WordMemory | null {
  return useMemo(() => {
    if (!word) return null;

    const stage = getMemoryStage(word);
    const horizonDays = getMemoryHorizonDays(word);
    const lastReview = parseSupabaseTimestamp(word.fsrs_last_review);
    const now = new Date();

    const base: WordMemory = {
      stage,
      horizonDays,
      summaryLabel: STRINGS.WORD_MEMORY_SUMMARY.replace(
        '{stage}',
        MEMORY_STAGE_LABELS[stage],
      ).replace('{horizon}', formatHorizon(horizonDays)),
      recallNow: null,
      nextHorizonLabel: nextHorizonLabelFor(word, now),
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      curve: null,
    };

    // No horizon means no curve. `getMemoryHorizonDays` already refuses the
    // placeholder values a never-practised word carries — including its
    // `fsrs_last_review`, which is stamped at save time and would otherwise
    // anchor a decay curve to a review that never happened.
    if (horizonDays == null || !lastReview) return base;

    const nowDays = Math.max(0, (now.getTime() - lastReview.getTime()) / MILLISECONDS_PER_DAY);
    const dueDate = parseSupabaseTimestamp(word.fsrs_due);
    const dueDays = dueDate
      ? (dueDate.getTime() - lastReview.getTime()) / MILLISECONDS_PER_DAY
      : null;

    // The horizon itself is in the max so a word still in short learning steps —
    // due in ten minutes but holding for half a day — is plotted across its
    // memory rather than across the gap to its next step, where it would be a
    // flat line at 100%.
    const spanDays = Math.max(horizonDays, nowDays, dueDays ?? 0) * SPAN_MULTIPLIER;

    if (!Number.isFinite(spanDays) || spanDays <= 0) return base;

    const points: MemoryCurvePoint[] = Array.from({ length: CURVE_SAMPLES }, (_, index) => {
      const days = (spanDays * index) / (CURVE_SAMPLES - 1);
      return {
        days,
        retrievability: FSRS_INSTANCE.forgetting_curve(days, horizonDays),
      };
    });

    const target = OPTIMIZED_FSRS_CONFIG.request_retention;
    // Fit the axis to this word's own decay instead of to a fixed floor. Across
    // the plotted span recall may only fall from 100% to 85%, and against a
    // 0–100 axis that is a flat line that explains nothing. The `min` keeps the
    // target rule on the chart even for a word that has barely decayed at all.
    const lowest = points[points.length - 1]?.retrievability ?? target;
    const floorRetrievability = Math.max(0, Math.min(lowest, target) - FLOOR_PADDING);

    return {
      ...base,
      recallNow: Math.round(calculateRetrievability(word, now, lastReview) * 100),
      curve: {
        points,
        spanDays,
        nowDays,
        dueDays: dueDays != null && dueDays >= 0 ? dueDays : null,
        targetRetrievability: target,
        floorRetrievability,
      },
    };
  }, [word]);
}

/**
 * What the horizon becomes if the learner recalls this word at its next review.
 *
 * Runs the real scheduler at Rating.Good — the rating "Knew it" maps to — so this
 * is a genuine forecast rather than an illustration. Returns null if ts-fsrs
 * can't schedule the card, which is not worth surfacing as an error on a screen
 * whose job is to show progress.
 */
function nextHorizonLabelFor(word: StudyWord, now: Date): string | null {
  try {
    const preview = FSRS_INSTANCE.repeat(convertToFSRSCard(word), now);
    const stability = preview[Rating.Good]?.card.stability;
    if (stability == null || !Number.isFinite(stability) || stability <= 0) return null;
    return formatHorizon(stability);
  } catch {
    return null;
  }
}
