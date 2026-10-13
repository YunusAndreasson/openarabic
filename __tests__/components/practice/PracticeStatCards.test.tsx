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
import { fireEvent, render, within } from '@testing-library/react-native';

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
  horizonByRootId: new Map(),
};

/** The disclosure signifier, as the icon mock renders it. */
const CHEVRON = 'chevron-forward';

const handlers = () => ({
  onDuePress: jest.fn(),
  onStreakPress: jest.fn(),
  onMemoryPress: jest.fn(),
  onReviewsPress: jest.fn(),
});

describe('PracticeStatCards order', () => {
  test('the due count comes first — it is the number the tab badge points at', () => {
    const view = render(
      <PracticeStatCards distribution={distribution} dueWords={23} {...handlers()} />,
    );

    // Document order of the three labels, read off the rendered tree.
    const tree = JSON.stringify(view.toJSON());
    const due = tree.indexOf(STRINGS.DUE_TODAY_LABEL);
    const recall = tree.indexOf(STRINGS.PRACTICE_RECALL_NOW_LABEL);
    const streak = tree.indexOf(STRINGS.STREAK_LABEL);

    expect(due).toBeGreaterThan(-1);
    expect(due).toBeLessThan(recall);
    expect(recall).toBeLessThan(streak);
  });
});

describe('PracticeStatCards habit row', () => {
  test('every tile in the row opens something — none of them swallows a press', () => {
    const press = handlers();
    const view = render(
      <PracticeStatCards
        distribution={distribution}
        currentStreak={9}
        totalReviews={412}
        {...press}
      />,
    );

    fireEvent.press(view.getByText(STRINGS.STREAK_LABEL));
    expect(press.onStreakPress).toHaveBeenCalled();

    fireEvent.press(view.getByText(STRINGS.REVIEWS_LABEL));
    expect(press.onReviewsPress).toHaveBeenCalled();
  });

  test('every panel that opens something shows the chevron — and only those', () => {
    const view = render(
      <PracticeStatCards
        distribution={distribution}
        currentStreak={9}
        totalReviews={412}
        {...handlers()}
      />,
    );

    // Four pressable panels: the due card, the recall card, and the two habit
    // tiles. One signifier each, no more and no fewer.
    expect(view.getAllByText(CHEVRON)).toHaveLength(4);
  });

  test('the reviews tile shows a measured zero rather than the empty metric', () => {
    // Unlike the streak beside it, zero reviews is a fact and not a pending
    // read — it sits directly above a "Review N words" button and reads as an
    // invitation.
    // The numeral counts to its value, so it is hidden from a screen reader
    // and read through the tile's own label instead — which also scopes the
    // query: the due and recall cards above render a hidden `0` of their own.
    const view = render(
      <PracticeStatCards
        distribution={distribution}
        currentStreak={7}
        totalReviews={0}
        {...handlers()}
      />,
    );

    const tile = within(view.getByLabelText(STRINGS.REVIEWS_TILE_A11Y.replace('{count}', '0')));

    expect(tile.getByText(STRINGS.REVIEWS_LABEL)).toBeTruthy();
    expect(tile.getByText('0', { includeHiddenElements: true })).toBeTruthy();
    expect(tile.queryByText(STRINGS.EMPTY_METRIC, { includeHiddenElements: true })).toBeNull();
  });
});
