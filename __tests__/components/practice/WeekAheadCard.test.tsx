/**
 * The practice screen's lead card: the due count the tab badge shows.
 *
 * The card exists so the number a learner follows into the tab is the first one
 * they find there, labelled and standing alone. These tests hold that — a label,
 * a bare numeral, the badge's own spelling at the fetch limit — and that the
 * footer never leaves the card a line short.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { WeekAheadCard } from '@/components/practice/WeekAheadCard';
import { PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { formatDueCount } from '@/utils/dueCountText';

/**
 * The numeral is hidden from the accessibility tree on purpose — the card's own
 * label reads the whole sentence — so the default queries cannot see it.
 */
const NUMERAL = { includeHiddenElements: true } as const;

/** The disclosure signifier, as the icon mock renders it. */
const CHEVRON = 'chevron-forward';

const renderCard = (props: { dueCount: number; reviewedToday?: number; onPress?: () => void }) =>
  render(<WeekAheadCard forecast={[]} reviewedToday={0} {...props} />);

describe('WeekAheadCard', () => {
  test('shows the due count as a labelled numeral, not inside a sentence', () => {
    const view = renderCard({ dueCount: 23 });

    expect(view.getByText(STRINGS.DUE_TODAY_LABEL)).toBeTruthy();
    // Exact match: the count is its own text node, so it can be set large.
    expect(view.getByText('23', NUMERAL)).toBeTruthy();
  });

  test('spells a clipped count the way the tab badge does', () => {
    const view = renderCard({ dueCount: PRACTICE_DUE_WORDS_LIMIT });

    expect(view.getByText(formatDueCount(PRACTICE_DUE_WORDS_LIMIT), NUMERAL)).toBeTruthy();
    expect(view.queryByText(String(PRACTICE_DUE_WORDS_LIMIT), NUMERAL)).toBeNull();
  });

  describe('footer line', () => {
    test('words due, some reviewed: says how many were reviewed today', () => {
      const view = renderCard({ dueCount: 23, reviewedToday: 12 });

      expect(view.getByText('12 words reviewed today')).toBeTruthy();
    });

    test('words due, none reviewed: still holds its line', () => {
      const view = renderCard({ dueCount: 23, reviewedToday: 0 });

      expect(view.getByText(STRINGS.TODAY_NOTHING_REVIEWED)).toBeTruthy();
    });

    test('caught up after reviewing: says both', () => {
      const view = renderCard({ dueCount: 0, reviewedToday: 12 });

      expect(view.getByText('0', NUMERAL)).toBeTruthy();
      expect(
        view.getByText(`${STRINGS.TODAY_ALL_CAUGHT_UP} · 12 words reviewed today`),
      ).toBeTruthy();
    });

    test('caught up with nothing reviewed: says only that', () => {
      const view = renderCard({ dueCount: 0, reviewedToday: 0 });

      expect(view.getByText('0', NUMERAL)).toBeTruthy();
      expect(view.getByText(STRINGS.TODAY_ALL_CAUGHT_UP)).toBeTruthy();
    });

    test('one word reviewed agrees in number', () => {
      const view = renderCard({ dueCount: 5, reviewedToday: 1 });

      expect(view.getByText('1 word reviewed today')).toBeTruthy();
    });
  });

  test('shows the chevron only when it leads somewhere', () => {
    expect(renderCard({ dueCount: 3, onPress: jest.fn() }).getAllByText(CHEVRON)).toHaveLength(1);
    expect(renderCard({ dueCount: 3 }).queryByText(CHEVRON)).toBeNull();
  });
});
