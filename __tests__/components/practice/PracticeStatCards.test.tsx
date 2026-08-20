/**
 * The practice screen's habit row.
 *
 * Two assertions here matter more than the rest, and they are the same rule from
 * both sides.
 *
 * Every tile in this row opens something. They are the same `BaseCard` at the
 * same size in the same row, so a tile that takes a press and does nothing does
 * not read as a static readout — it reads as broken. "Reviews done" was exactly
 * that until it was given a sheet, and it was reported as a bug rather than as a
 * missing feature.
 *
 * And every panel that opens something SAYS so, with the one chevron this app
 * uses for disclosure. Giving the tile a destination fixed half the problem;
 * until the signifier followed, five pressable cards on this screen shared a
 * single chevron between them.
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

/** The disclosure signifier, as the icon mock renders it. */
const CHEVRON = 'chevron-forward';

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

  test('every panel that opens something shows the chevron — and only those', () => {
    const view = render(
      <PracticeStatCards
        distribution={distribution}
        currentStreak={9}
        totalReviews={412}
        leechCount={3}
        {...handlers()}
      />,
    );

    // Five pressable panels: the memory hero, the week-ahead row, and the three
    // habit tiles. One signifier each, no more and no fewer.
    expect(view.getAllByText(CHEVRON)).toHaveLength(5);
  });

  test('a panel that is not there cannot claim a disclosure', () => {
    // Revisit is conditional, so the count of signifiers has to follow the count
    // of panels rather than being hardcoded anywhere.
    const view = render(
      <PracticeStatCards distribution={distribution} leechCount={0} {...handlers()} />,
    );

    expect(view.getAllByText(CHEVRON)).toHaveLength(4);
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
