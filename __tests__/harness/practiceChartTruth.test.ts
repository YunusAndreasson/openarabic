/**
 * Practice SRS chart truth harness
 * ================================
 *
 * The Practice tab renders several numbers-bearing surfaces off one array of
 * `StudyWord`s: the memory horizon constellation, the due-words prognosis,
 * the retrievability forecast, and the stat cards.
 *
 * Existing unit tests for those hooks mock out the layer that does the
 * counting, so nothing else checks that the numbers on screen describe the
 * data.
 *
 * This harness does. It:
 *   1. builds a vocabulary whose ground truth is known by construction,
 *   2. runs it through the REAL production code path (no calculation mocks),
 *   3. compares against expectations derived from the product spec, and
 *   4. asserts cross-surface invariants — two numbers on the same screen
 *      that describe the same thing must agree.
 *
 * Clock is pinned so every assertion is deterministic.
 */

import { renderHook } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { State } from 'ts-fsrs';

// The repo-wide Skia mock is built from jest.fn()s, and jest.config sets
// `resetMocks: true` — so by the time a test runs, PathBuilder.Make() returns
// undefined and every chart hook throws. Substitute a real (tiny) SVG path
// builder instead of a stub: plain closures survive resetMocks, and the emitted
// path string is genuine, so geometry assertions below actually mean something.
jest.mock('react-native-skia', () => {
  const makePathBuilder = () => {
    const segments: string[] = [];
    const builder = {
      moveTo: (x: number, y: number) => {
        segments.push(`M${x} ${y}`);
        return builder;
      },
      lineTo: (x: number, y: number) => {
        segments.push(`L${x} ${y}`);
        return builder;
      },
      cubicTo: (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) => {
        segments.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`);
        return builder;
      },
      quadTo: (cx: number, cy: number, x: number, y: number) => {
        segments.push(`Q${cx} ${cy} ${x} ${y}`);
        return builder;
      },
      addRect: (r: { x: number; y: number; width: number; height: number }) => {
        segments.push(`R${r.x} ${r.y} ${r.width} ${r.height}`);
        return builder;
      },
      close: () => {
        segments.push('Z');
        return builder;
      },
      build: () => ({ toSVGString: () => segments.join(' ') }),
    };
    return builder;
  };

  return {
    Skia: { PathBuilder: { Make: makePathBuilder } },
  };
});

import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { useMemoryInsights } from '@/hooks/vocabulary/useMemoryInsights';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateDueWordsForecast,
  calculateRetrievability,
  calculateRetrievabilityForecast,
} from '@/utils/fsrsUtils';
import { getMemoryHorizonDays } from '@/utils/memoryHorizon';
import { countReviewedToday, isDueWord, isMasteredWord } from '@/utils/wordClassification';
import { normalizeTimestamp, parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { DAYS_7 } from '@/constants/chartConstants';

// The screen counts by mapping the shared predicate over its list — there is no
// separate aggregate function, deliberately, so a headline can never drift from
// the filter that produced the rows underneath it. These mirror that exactly.
const calculateDueWords = (words: StudyWord[]): number => words.filter(isDueWord).length;
const calculateMasteredWords = (words: StudyWord[]): number => words.filter(isMasteredWord).length;

// ---------------------------------------------------------------------------
// Pinned clock. 2026-08-09T12:00:00Z — midday UTC, so a UTC/local day flip in
// the test runner's zone cannot silently rescue an off-by-one-day bug.
// ---------------------------------------------------------------------------
const NOW = new Date('2026-08-09T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick'] });
  jest.setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Fixture builder. Every field is stated in human terms and converted once,
// so a scenario reads as the vocabulary it describes.
// ---------------------------------------------------------------------------
interface WordSpec {
  id: number;
  /** Days before NOW the word was added to the practice list */
  createdDaysAgo: number;
  /** FSRS state: 0 new, 1 learning, 2 review, 3 relearning */
  state: 0 | 1 | 2 | 3;
  /** Memory stability in days */
  stability: number;
  /** Hours before NOW of the last review (null = never reviewed) */
  reviewedHoursAgo: number | null;
  /** Hours from NOW until the card falls due (negative = already due) */
  dueInHours: number | null;
  reps?: number;
  /** Timestamp encoding, to prove the charts are format-agnostic */
  format?: 'iso' | 'postgrest';
}

/** PostgREST's on-the-wire form for a timestamptz: "2026-08-09 12:00:00+00". */
const asPostgrest = (d: Date): string => `${d.toISOString().slice(0, 19).replace('T', ' ')}+00`;

const stamp = (d: Date, format: WordSpec['format']): string =>
  format === 'postgrest' ? asPostgrest(d) : d.toISOString();

function makeWord(spec: WordSpec): StudyWord {
  const created = new Date(NOW.getTime() - spec.createdDaysAgo * DAY);
  const lastReview =
    spec.reviewedHoursAgo === null ? null : new Date(NOW.getTime() - spec.reviewedHoursAgo * HOUR);
  const due = spec.dueInHours === null ? null : new Date(NOW.getTime() + spec.dueInHours * HOUR);

  return {
    id: spec.id,
    user_id: 'user-harness',
    root_id: spec.id,
    created_at: stamp(created, spec.format),
    fsrs_state: spec.state,
    fsrs_stability: spec.stability,
    fsrs_difficulty: 6.5,
    fsrs_due: due ? stamp(due, spec.format) : null,
    fsrs_last_review: lastReview ? stamp(lastReview, spec.format) : null,
    fsrs_reps: spec.reps ?? (spec.state === 0 ? 0 : 4),
    fsrs_lapses: 0,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 0,
    fsrs_learning_steps: 0,
  } as unknown as StudyWord;
}

// ---------------------------------------------------------------------------
// The scenario vocabulary: 14 words with fully known properties.
//
//   mastered (state 2, stability >= 5) ............ ids 1-5   → 5 words
//   consolidating (state 2, stability < 5) ........ ids 6-7   → 2 words
//   learning (state 1) ............................ ids 8-9   → 2 words
//   relearning (state 3) .......................... id  10    → 1 word
//   brand new, never reviewed (state 0) ........... ids 11-13 → 3 words
//   mastered but added only today ................. id  14    → 1 word
// ---------------------------------------------------------------------------
const SCENARIO: WordSpec[] = [
  // Mastered, long-standing, reviewed a while back, not yet due
  { id: 1, createdDaysAgo: 90, state: 2, stability: 30, reviewedHoursAgo: 10 * 24, dueInHours: 48 },
  { id: 2, createdDaysAgo: 80, state: 2, stability: 20, reviewedHoursAgo: 5 * 24, dueInHours: 72 },
  { id: 3, createdDaysAgo: 60, state: 2, stability: 12, reviewedHoursAgo: 3 * 24, dueInHours: 96 },
  // Mastered and already due (overdue by a day)
  { id: 4, createdDaysAgo: 50, state: 2, stability: 8, reviewedHoursAgo: 9 * 24, dueInHours: -24 },
  // Mastered, due later inside the 7-day forecast window
  { id: 5, createdDaysAgo: 40, state: 2, stability: 6, reviewedHoursAgo: 24, dueInHours: 5 * 24 },
  // Consolidating: state 2 but below the mastery stability bar
  { id: 6, createdDaysAgo: 20, state: 2, stability: 4, reviewedHoursAgo: 12, dueInHours: 36 },
  { id: 7, createdDaysAgo: 15, state: 2, stability: 2, reviewedHoursAgo: 30, dueInHours: -2 },
  // Learning
  { id: 8, createdDaysAgo: 3, state: 1, stability: 0.5, reviewedHoursAgo: 1, dueInHours: -0.2 },
  { id: 9, createdDaysAgo: 2, state: 1, stability: 0.4, reviewedHoursAgo: 5, dueInHours: -4 },
  // Relearning (lapsed today)
  { id: 10, createdDaysAgo: 30, state: 3, stability: 1, reviewedHoursAgo: 0.5, dueInHours: -0.1 },
  // Brand new — never reviewed. Note the app stamps fsrs_last_review at
  // creation even though reps is 0 (see utils/fsrsInitializers.ts).
  { id: 11, createdDaysAgo: 1, state: 0, stability: 0.4, reviewedHoursAgo: 24, dueInHours: -24 },
  { id: 12, createdDaysAgo: 0.5, state: 0, stability: 0.4, reviewedHoursAgo: 12, dueInHours: -12 },
  { id: 13, createdDaysAgo: 0.2, state: 0, stability: 0.4, reviewedHoursAgo: 5, dueInHours: -5 },
  // Mastered word added today (tests the created_at gate on the mastery chart)
  {
    id: 14,
    createdDaysAgo: 0.1,
    state: 2,
    stability: 40,
    reviewedHoursAgo: 2,
    dueInHours: 30 * 24,
  },
];

const WORDS: StudyWord[] = SCENARIO.map(makeWord);

/** Ground truth, stated independently of any production helper. */
const TRUTH = {
  totalWords: 14,
  /** state 2 AND stability >= 5 → ids 1,2,3,4,5,14 */
  masteredWords: 6,
} as const;

// ===========================================================================
describe('sanity: the fixture says what it claims', () => {
  test('ground truth matches the production classifiers', () => {
    expect(WORDS).toHaveLength(TRUTH.totalWords);
    expect(calculateMasteredWords(WORDS)).toBe(TRUTH.masteredWords);
  });
});

// ===========================================================================
describe('due-words prognosis', () => {
  test('"now" on the chart equals the due count the Practice tab acts on', () => {
    // The chart's first column is labelled "Now" and the card beside the
    // Review action reads "Due now". Both describe the same queue — and the
    // column the charts DRAW is `newlyDue`, so that is the one held to it.
    const forecast = calculateDueWordsForecast(WORDS, DAYS_7);
    const screenDueCount = calculateDueWords(WORDS);
    expect(forecast[0]?.dueWords ?? 0).toBe(screenDueCount);
    expect(forecast[0]?.newlyDue ?? 0).toBe(screenDueCount);
  });

  test('each later column is only what that day adds — every word lands on exactly one day', () => {
    // The charts draw this per-day series. It used to be the running backlog,
    // which can only rise; here each word with a due date inside the window is
    // counted in exactly ONE column — the first bucket whose instant has reached
    // its due time — so the columns partition the words rather than re-count
    // them, and nothing forces the last day to be the "busiest".
    const forecast = calculateDueWordsForecast(WORDS, DAYS_7);
    const bucketEnds = forecast.map(day => day.date.getTime());
    const expected = new Array<number>(DAYS_7).fill(0);
    for (const word of WORDS) {
      const dueMs =
        word.fsrs_state === State.New
          ? Number.NEGATIVE_INFINITY
          : (parseSupabaseTimestamp(word.fsrs_due)?.getTime() ?? Number.POSITIVE_INFINITY);
      const bucket = bucketEnds.findIndex(end => dueMs <= end);
      if (bucket >= 0) expected[bucket] = (expected[bucket] ?? 0) + 1;
    }
    expect(forecast.map(day => day.newlyDue)).toEqual(expected);
    forecast.forEach(day => expect(day.newlyDue).toBeGreaterThanOrEqual(0));
  });

  test('a word that falls due later tonight is not already "due today"', () => {
    // The forecast buckets each day at 23:59:59 local, so "today" answers
    // "will be due by midnight" — but the label, the subtitle and the CTA all
    // read as "due now". A word scheduled for tonight is counted from 00:01.
    // Land the due time midway between NOW and local midnight, so the case is
    // exercised whatever timezone the runner is in.
    const localEndOfDay = new Date(NOW);
    localEndOfDay.setHours(23, 59, 59, 999);
    const hoursToMidnight = (localEndOfDay.getTime() - NOW.getTime()) / HOUR;
    expect(hoursToMidnight).toBeGreaterThan(0.5); // fixture precondition

    const tonight = [
      makeWord({
        id: 60,
        createdDaysAgo: 10,
        state: 2,
        stability: 9,
        reviewedHoursAgo: 48,
        dueInHours: hoursToMidnight / 2, // later today, but still ahead of NOW
      }),
    ];
    expect(calculateDueWords(tonight)).toBe(0);
    expect(calculateDueWordsForecast(tonight, DAYS_7)[0]?.dueWords).toBe(0);
  });

  test('a recently reviewed but overdue word is counted the same by both', () => {
    // "Due" is a property of the schedule. The 2h session cooldown is a gate on
    // re-serving a finished session's words — the server applies it only when a
    // session just completed, and exempts states 0/1/3 even then. Neither the
    // forecast nor the classifier may apply it unilaterally, or the chart and
    // the CTA beside it disagree for most of the day.
    const justReviewed = [
      makeWord({
        id: 61,
        createdDaysAgo: 10,
        state: 2,
        stability: 9,
        reviewedHoursAgo: 0.5,
        dueInHours: -0.25,
      }),
    ];
    expect(calculateDueWordsForecast(justReviewed, DAYS_7)[0]?.dueWords).toBe(
      calculateDueWords(justReviewed),
    );
    expect(calculateDueWords(justReviewed)).toBe(1);
  });

  test('a brand-new word is forecast as due today', () => {
    // New words (state 0) are always due for their first review — that is the
    // rule the server filter and the Practice screen both use.
    const onlyNew = [
      makeWord({
        id: 99,
        createdDaysAgo: 0.1,
        state: 0,
        stability: 0.4,
        reviewedHoursAgo: 2.4,
        dueInHours: -2.4,
      }),
    ];
    const forecast = calculateDueWordsForecast(onlyNew, DAYS_7);
    expect(forecast[0]?.dueWords).toBe(1);
  });

  test('the forecast is non-decreasing across the window', () => {
    // Nothing is reviewed inside a forecast, so the due backlog can only grow.
    const forecast = calculateDueWordsForecast(WORDS, DAYS_7);
    for (let i = 1; i < forecast.length; i++) {
      expect(forecast[i]?.dueWords ?? 0).toBeGreaterThanOrEqual(forecast[i - 1]?.dueWords ?? 0);
    }
  });

  test('every word is eventually forecast due, and none more than once', () => {
    const forecast = calculateDueWordsForecast(WORDS, DAYS_7);
    const last = forecast[forecast.length - 1]?.dueWords ?? 0;
    // Words falling due within 7 days: everything with dueInHours < 7*24.
    const dueWithinWindow = SCENARIO.filter(
      s => s.dueInHours !== null && s.dueInHours < DAYS_7 * 24,
    ).length;
    expect(last).toBe(dueWithinWindow);
    expect(last).toBeLessThanOrEqual(WORDS.length);
  });

  test('newlyDue sums back to the final backlog', () => {
    const forecast = calculateDueWordsForecast(WORDS, DAYS_7);
    const summed = forecast.reduce((total, day) => total + day.newlyDue, 0);
    expect(summed).toBe(forecast[forecast.length - 1]?.dueWords ?? 0);
  });
});

// ===========================================================================
describe('retrievability forecast', () => {
  /** Reference: mean forgetting curve over reviewed words, from the spec. */
  const referenceRetrievability = (words: StudyWord[], at: Date): number => {
    const reviewed = words.filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0);
    if (reviewed.length === 0) return 0;
    const total = reviewed.reduce((sum, w) => {
      const lastReview = parseSupabaseTimestamp(w.fsrs_last_review);
      if (!lastReview) return sum;
      return sum + calculateRetrievability(w, at, lastReview);
    }, 0);
    return (total / reviewed.length) * 100;
  };

  test('today’s percentage matches the forgetting curve over reviewed words', () => {
    const forecast = calculateRetrievabilityForecast(WORDS, DAYS_7);
    const todayBucket = forecast[0];
    expect(todayBucket).toBeDefined();
    const expected = referenceRetrievability(WORDS, todayBucket!.date);
    expect(todayBucket!.averageRetrievability).toBeCloseTo(expected, 6);
  });

  test('only reviewed words are averaged — new words do not dilute the score', () => {
    const forecast = calculateRetrievabilityForecast(WORDS, DAYS_7);
    const reviewedCount = WORDS.filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0).length;
    expect(forecast[0]?.wordCount).toBe(reviewedCount);
    expect(reviewedCount).toBeLessThan(WORDS.length);
  });

  test('retention decays monotonically when nothing is reviewed', () => {
    const forecast = calculateRetrievabilityForecast(WORDS, DAYS_7);
    for (let i = 1; i < forecast.length; i++) {
      expect(forecast[i]?.averageRetrievability ?? 0).toBeLessThanOrEqual(
        forecast[i - 1]?.averageRetrievability ?? 0,
      );
    }
  });

  test('percentages stay inside 0-100', () => {
    const forecast = calculateRetrievabilityForecast(WORDS, DAYS_7);
    forecast.forEach(day => {
      expect(day.averageRetrievability).toBeGreaterThanOrEqual(0);
      expect(day.averageRetrievability).toBeLessThanOrEqual(100);
    });
  });

  test('"at risk" counts the words actually below the risk threshold', () => {
    const forecast = calculateRetrievabilityForecast(WORDS, DAYS_7);
    const today = forecast[0]!;
    const expectedCritical = WORDS.filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0).filter(
      w =>
        calculateRetrievability(w, today.date, parseSupabaseTimestamp(w.fsrs_last_review)!) < 0.7,
    ).length;
    expect(today.criticalWords).toBe(expectedCritical);
  });
});

// ===========================================================================
describe('timestamp format robustness', () => {
  // Supabase/PostgREST hands back timestamptz as "2026-08-09 12:00:00+00";
  // the app also writes Date.toISOString() ("2026-08-09T12:00:00.000Z").
  // Both reach these charts. The numbers must not depend on which one.
  const isoWords = SCENARIO.map(s => makeWord({ ...s, format: 'iso' }));
  const pgWords = SCENARIO.map(s => makeWord({ ...s, format: 'postgrest' }));

  test('retrievability is identical for both encodings', () => {
    const iso = calculateRetrievabilityForecast(isoWords, DAYS_7);
    const pg = calculateRetrievabilityForecast(pgWords, DAYS_7);
    pg.forEach((day, i) => {
      expect(day.averageRetrievability).toBeCloseTo(iso[i]!.averageRetrievability, 6);
      expect(day.criticalWords).toBe(iso[i]!.criticalWords);
    });
  });

  test('due-words forecast is identical for both encodings', () => {
    const iso = calculateDueWordsForecast(isoWords, DAYS_7);
    const pg = calculateDueWordsForecast(pgWords, DAYS_7);
    pg.forEach((day, i) => expect(day.dueWords).toBe(iso[i]!.dueWords));
  });

  test('normalizeTimestamp must not turn a parseable stamp into NaN', () => {
    // The exact mechanism behind the failure above. PostgREST writes the UTC
    // offset as "+00"; the runtime parses the space-separated form via its
    // legacy date parser, but "T" + "+00" is neither legal ISO 8601 nor legacy
    // syntax — so normalizing the space to a T destroys the value.
    const wire = '2026-08-09 12:00:00+00';
    expect(Number.isNaN(Date.parse(wire))).toBe(false); // parseable as delivered
    expect(Number.isNaN(Date.parse(normalizeTimestamp(wire)!))).toBe(false);
    // parseSupabaseTimestamp is the helper that gets this right.
    expect(parseSupabaseTimestamp(wire)?.toISOString()).toBe('2026-08-09T12:00:00.000Z');
  });

  test('every due/last-review consumer agrees on one parse', () => {
    // wordClassification, fsrsUtils, useFSRSQueries and notificationPlanner all
    // parse the same columns. They must not disagree about what a stamp means.
    const wire = '2026-08-09 06:00:00+00';
    const canonical = parseSupabaseTimestamp(wire)!.getTime();
    expect(Date.parse(normalizeTimestamp(wire)!)).toBe(canonical);
  });

  test('the mastered count is identical for both encodings', () => {
    expect(calculateMasteredWords(pgWords)).toBe(calculateMasteredWords(isoWords));
  });

  test('a timestamp with no zone is read as UTC, not as device-local time', () => {
    // A naive "2026-08-09T06:00:00" must mean 06:00 UTC. Reading it as local
    // time silently shifts every derived age by the device offset.
    const naive = '2026-08-09T06:00:00';
    const word = {
      ...WORDS[0]!,
      fsrs_last_review: naive,
      fsrs_stability: 1,
      fsrs_reps: 4,
    } as StudyWord;
    const at = new Date('2026-08-09T18:00:00.000Z');
    const viaChart = calculateRetrievability(word, at);
    const viaParser = calculateRetrievability(word, at, parseSupabaseTimestamp(naive)!);
    expect(viaChart).toBeCloseTo(viaParser, 10);
  });
});

// ===========================================================================
describe('what the memory-strength surfaces claim to measure', () => {
  // Verified against a live account on 2026-08-09 (emulator-5554, 10 words):
  // the gauge read "97%" under the heading "How much of your vocabulary you'd
  // remember if quizzed right now" while only ONE of the ten words had ever
  // been reviewed.
  const NEVER_REVIEWED: WordSpec[] = Array.from({ length: 9 }, (_, i) => ({
    id: 200 + i,
    createdDaysAgo: 0.2,
    state: 0 as const,
    stability: 0.4,
    // The app stamps fsrs_last_review at creation time even though the word
    // has never been shown — see utils/fsrsInitializers.ts.
    reviewedHoursAgo: 4.8,
    dueInHours: -4.8,
    reps: 0,
  }));
  const ONE_REVIEWED: WordSpec = {
    id: 210,
    createdDaysAgo: 0.2,
    state: 1,
    stability: 1.29,
    reviewedHoursAgo: 1,
    dueInHours: -0.5,
    reps: 1,
  };
  const MOSTLY_NEW = [...NEVER_REVIEWED, ONE_REVIEWED].map(makeWord);

  test('the percentage reports the population it was averaged over', () => {
    // The score is the forgetting curve over words with a review behind them —
    // a word never shown has no memory state to decay. What matters is that the
    // surfaces say so: the copy reads "what you've practised", and wordCount is
    // carried through as `measuredWords` so the UI can show an empty state
    // rather than a number that looks like it covers everything.
    const forecast = calculateRetrievabilityForecast(MOSTLY_NEW, DAYS_7);
    const reviewed = MOSTLY_NEW.filter(w => (w.fsrs_reps ?? 0) > 0).length;
    expect(forecast[0]?.wordCount).toBe(reviewed);
  });

  test('a vocabulary nobody has reviewed yet measures nothing', () => {
    // Zero measured words must be distinguishable from 0% recall, so the
    // practice tile and gauge can render an empty state instead of telling a
    // learner who has not started that they remember none of their words.
    const allNew = NEVER_REVIEWED.map(makeWord);
    const forecast = calculateRetrievabilityForecast(allNew, DAYS_7);
    expect(forecast[0]?.wordCount).toBe(0);
  });

  test('"reviewed today" counts words that were actually reviewed', () => {
    // countReviewedToday keys off fsrs_last_review alone. Because that column
    // is stamped at creation, every word added today is reported as reviewed
    // today — live reading was "10 reviewed today" against fsrs_reps totalling 1.
    const reviewedToday = countReviewedToday(MOSTLY_NEW);
    const actuallyReviewed = MOSTLY_NEW.filter(w => (w.fsrs_reps ?? 0) > 0).length;
    expect(reviewedToday).toBe(actuallyReviewed);
  });

  test('the hero count is the retention average, un-averaged', () => {
    // The hero's "412 words you'd recall right now" is Σ R, and the forecast's
    // percentage is Σ R / N — the same fact in two units.
    //
    // The memory sheet used to open with that percentage on a gauge, which is
    // why this invariant was once called a cross-surface check. It is now the
    // reason the gauge is gone: a detail view that leads with the number you
    // tapped, divided by its own denominator, has told you nothing. The
    // invariant still holds and still matters — the hero is derived from this
    // average, so if they could disagree the hero would be the one lying.
    const { result } = renderHook(() => useMemoryInsights(WORDS));
    const { recallableWords, currentRetrievability, measuredWords } = result.current;

    expect(recallableWords).toBe(
      Math.min(measuredWords, Math.round((currentRetrievability / 100) * measuredWords)),
    );
    // And it can never claim more recallable words than there are words.
    expect(recallableWords).toBeLessThanOrEqual(measuredWords);
  });

  test('nothing practised yet reports no recallable words, never zero recall', () => {
    const allNew = NEVER_REVIEWED.map(makeWord);
    const { result } = renderHook(() => useMemoryInsights(allNew));
    const { recallableWords, measuredWords } = result.current;

    // measuredWords 0 is what the hero gates its "—" on. recallableWords is
    // also 0 here, but the UI must never render it: 0 measured is an absence of
    // measurement, not a measurement of nothing.
    expect(measuredWords).toBe(0);
    expect(recallableWords).toBe(0);
  });

  test('the week-ahead slipping count is a delta, and never negative', () => {
    // Retrievability decays monotonically with no reviews, so the number of
    // at-risk words can only grow across the window.
    const { result } = renderHook(() => useMemoryInsights(WORDS));
    const { criticalWords, criticalWordsInWeek } = result.current;
    const forecast = calculateRetrievabilityForecast(WORDS, DAYS_7);

    expect(criticalWordsInWeek).toBeGreaterThanOrEqual(0);
    expect(criticalWords + criticalWordsInWeek).toBe(forecast[forecast.length - 1]?.criticalWords);
  });
});

// ===========================================================================
describe('memory horizon constellation', () => {
  test('the dots account for exactly the practised words, and no others', () => {
    const { result } = renderHook(() => useMemoryHorizonDistribution(WORDS));
    const { result: retention } = renderHook(() => useMemoryInsights(WORDS));

    const plotted = result.current.bins.reduce((sum, count) => sum + count, 0);

    // Cross-surface: the constellation and the memory gauge must be speaking
    // about the same population. Both gate on hasBeenPractised, so a word that
    // has a horizon must also be one the forgetting curve can speak for.
    expect(plotted).toBe(result.current.practisedCount);
    expect(plotted).toBe(retention.current.measuredWords);
    expect(result.current.practisedCount + result.current.notStartedCount).toBe(WORDS.length);
  });

  test('the bands partition the same population as the bins', () => {
    const { result } = renderHook(() => useMemoryHorizonDistribution(WORDS));
    const banded = result.current.bands.reduce((sum, band) => sum + band.count, 0);
    expect(banded).toBe(result.current.practisedCount);
  });

  test('the median sits inside the collection it describes', () => {
    const { result } = renderHook(() => useMemoryHorizonDistribution(WORDS));
    const horizons = WORDS.map(getMemoryHorizonDays).filter((d): d is number => d != null);

    expect(result.current.medianDays).not.toBeNull();
    expect(result.current.medianDays as number).toBeGreaterThanOrEqual(Math.min(...horizons));
    expect(result.current.medianDays as number).toBeLessThanOrEqual(Math.max(...horizons));
    // Half at or below, by definition — the property the copy claims out loud.
    const atOrBelow = horizons.filter(d => d <= (result.current.medianDays as number)).length;
    expect(atOrBelow).toBeGreaterThanOrEqual(Math.floor(horizons.length / 2));
  });

  test('a placeholder word contributes to the total and to nothing else', () => {
    // Exactly what createInitialFSRSEntry / createResetFSRSUpdate write: NOT
    // nulls. Reading these as a real memory is the trap that has bitten twice.
    const placeholder = makeWord({
      id: 900,
      createdDaysAgo: 0,
      state: 0,
      stability: 0.4,
      reviewedHoursAgo: 0,
      dueInHours: 0,
      reps: 0,
    });

    const { result } = renderHook(() => useMemoryHorizonDistribution([placeholder]));

    expect(result.current.totalWords).toBe(1);
    expect(result.current.practisedCount).toBe(0);
    expect(result.current.notStartedCount).toBe(1);
    expect(result.current.hasDistribution).toBe(false);
    expect(result.current.medianDays).toBeNull();
    expect(result.current.bins).toEqual(expect.arrayOf(0));
  });
});

// ===========================================================================
describe('empty and degenerate vocabularies', () => {
  test('no words → every headline reads zero, nothing renders as NaN', () => {
    expect(calculateMasteredWords([])).toBe(0);

    const due = calculateDueWordsForecast([], DAYS_7);
    due.forEach(day => {
      expect(day.dueWords).toBe(0);
      expect(day.newlyDue).toBe(0);
    });

    const retention = calculateRetrievabilityForecast([], DAYS_7);
    retention.forEach(day => expect(Number.isNaN(day.averageRetrievability)).toBe(false));
  });

  test('a word with null fsrs_due is never forecast due, on any day', () => {
    const noDue = [
      makeWord({
        id: 50,
        createdDaysAgo: 5,
        state: 2,
        stability: 9,
        reviewedHoursAgo: 20,
        dueInHours: null,
      }),
    ];
    // It has no due date at all, so no column of either series may count it.
    calculateDueWordsForecast(noDue, DAYS_7).forEach(day => {
      expect(day.dueWords).toBe(0);
      expect(day.newlyDue).toBe(0);
    });
  });
});
