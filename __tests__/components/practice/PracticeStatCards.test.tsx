/**
 * The practice screen's habit row.
 *
 * One assertion here matters more than the rest: every tile in this row opens
 * something. They are the same `BaseCard` at the same size in the same row, so
 * a tile that takes a press and does nothing does not read as a static readout —
 * it reads as broken. "Reviews done" was exactly that until it was given a
 * sheet, and it was reported as a bug rather than as a missing feature.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { PracticeStatCards } from '@/components/practice/PracticeStatCards';
import { STRINGS } from '@/constants/strings';
import type { MemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';

const distribution: MemoryHorizonDistribution = {
  bins: [],
  maxBinCount: 0,
  wordsPerDot: 1,
  bands: [],
  medianDays: null,
  medianLabel: '',
  medianFraction: 0,
  practisedCount: 0,
  notStartedCount: 0,
  totalWords: 0,
  hasDistribution: false,
};

const handlers = () => ({
  onDuePress: jest.fn(),
  onStreakPress: jest.fn(),
  onMemoryPress: jest.fn(),
  onRevisitPress: jest.fn(),
  onReviewsPress: jest.fn(),
});

describe('PracticeStatCards habit row', () => {
  test('every tile in the row opens something — none of them swallows a press', () => {
    const press = handlers();
    const view = render(
      <PracticeStatCards
        distribution={distribution}
        currentStreak={9}
        totalReviews={412}
        leechCount={3}
        {...press}
      />,
    );

    fireEvent.press(view.getByText(STRINGS.STREAK_LABEL));
    expect(press.onStreakPress).toHaveBeenCalled();

    fireEvent.press(view.getByText(STRINGS.REVIEWS_LABEL));
    expect(press.onReviewsPress).toHaveBeenCalled();

    fireEvent.press(view.getByText(STRINGS.REVISIT_LABEL));
    expect(press.onRevisitPress).toHaveBeenCalled();
  });

  test('the reviews tile shows a measured zero rather than the empty metric', () => {
    // Unlike the streak beside it, zero reviews is a fact and not a pending
    // read — it sits directly above a "Review N words" button and reads as an
    // invitation.
    // A non-zero streak beside it, so the only `0` on screen is the one under test.
    const view = render(
      <PracticeStatCards
        distribution={distribution}
        currentStreak={7}
        totalReviews={0}
        {...handlers()}
      />,
    );

    expect(view.getByText(STRINGS.REVIEWS_LABEL)).toBeTruthy();
    expect(view.getByText('0')).toBeTruthy();
    expect(view.queryByText(STRINGS.EMPTY_METRIC)).toBeNull();
  });

  test('the revisit tile stays away until there is something to revisit', () => {
    const view = render(
      <PracticeStatCards distribution={distribution} leechCount={0} {...handlers()} />,
    );

    expect(view.queryByText(STRINGS.REVISIT_LABEL)).toBeNull();
  });
});
