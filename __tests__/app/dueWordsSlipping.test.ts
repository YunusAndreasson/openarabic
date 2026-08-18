/**
 * The claim this guards: "Nothing slipping" is a MEASUREMENT, and the due-words
 * sheet may only make it about words the forgetting curve can actually speak
 * for.
 *
 * `calculateRetrievabilityForecast` filters to practised words but still returns
 * one entry per forecast day, so an account with saved-but-never-reviewed words
 * comes back with a full forecast whose `wordCount` is 0 — and both critical
 * counts are 0, which previously rendered as an all-clear over an empty set.
 */
import { describe, expect, test } from '@jest/globals';

import { buildSlippingSummary } from '@/app/due-words';
import { STRINGS } from '@/constants/strings';
import type { MemoryInsights } from '@/hooks/vocabulary/useMemoryInsights';

const insights = (overrides: Partial<MemoryInsights> = {}): MemoryInsights => ({
  currentRetrievability: 0,
  weekRetrievability: 0,
  criticalWords: 0,
  criticalWordsInWeek: 0,
  recallableWords: 0,
  measuredWords: 0,
  ...overrides,
});

describe('buildSlippingSummary', () => {
  test('says nothing at all for an account that has practised nothing', () => {
    // 40 words saved, none reviewed: the forecast exists, every count is 0.
    expect(buildSlippingSummary(insights({ measuredWords: 0 }))).toBeNull();
  });

  test('reports an all-clear only once there is something measured', () => {
    const summary = buildSlippingSummary(insights({ measuredWords: 12 }));

    expect(summary).toContain(STRINGS.PRACTICE_NOTHING_SLIPPING);
    expect(summary).toContain(STRINGS.PRACTICE_NOTHING_SLIPPING_WEEK);
  });

  test('names the counts when words are slipping', () => {
    const summary = buildSlippingSummary(
      insights({ measuredWords: 30, criticalWords: 4, criticalWordsInWeek: 7 }),
    );

    expect(summary).toContain('4');
    expect(summary).toContain('7');
  });
});
