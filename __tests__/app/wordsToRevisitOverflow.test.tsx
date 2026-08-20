/**
 * The way out of the capped "Words to revisit" list.
 *
 * The sheet ranks and shows the hardest `LEECH_LIST_LIMIT` (20). The tile that
 * opens it counts every leech, uncapped and deliberately so — telling someone
 * with 47 leeches that they have 20 was fixed on the tile long ago. The sheet
 * had the identical hole one level down: twenty rows, nothing saying more
 * existed, and no route to them.
 *
 * So there are two rules here, and the second matters as much as the first: the
 * overflow appears when the list truncated, and stays away when it did not. A
 * row offering to "see all" the words already on screen is a drill-down that
 * leads back to what you just read.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { LEECH_LIST_LIMIT, LEECH_MIN_LAPSES } from '@/constants/fsrs';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { isDictionaryScope } from '@/hooks/vocabulary/useDictionaryList';
import type { StudyWord } from '@/types/vocabulary.types';

const mockNavigate = jest.fn();

jest.mock('@/utils/sheetNavigation', () => ({
  dismissSheetThenNavigate: (...args: unknown[]) => mockNavigate(...args),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockLeeches: { allWords: StudyWord[] } = { allWords: [] };

jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useFSRSQueries: () => ({ allWords: mockLeeches.allWords, isLoading: false, error: null }),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

jest.mock('@/hooks/vocabulary/useResetWordProgress', () => ({
  useResetWordProgress: () => ({ confirmReset: jest.fn() }),
}));

// eslint-disable-next-line import/first -- must be imported after the mocks above
import WordsToRevisitScreen from '@/app/words-to-revisit';

/** A word that qualifies as a leech: enough lapses, and actually practised. */
const leech = (id: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: State.Review,
    fsrs_reps: 5,
    fsrs_lapses: LEECH_MIN_LAPSES + (id % 3),
  });

const givenLeeches = (count: number): void => {
  mockLeeches.allWords = Array.from({ length: count }, (_, index) => leech(index + 1));
};

const seeAll = (total: number): string =>
  STRINGS.WORDS_TO_REVISIT_SEE_ALL.replace('{count}', String(total));

describe('Words to revisit — overflow into the dictionary', () => {
  test('a truncated list says how many there are and opens all of them', () => {
    const total = LEECH_LIST_LIMIT + 27;
    givenLeeches(total);

    const view = render(<WordsToRevisitScreen />);

    // The count is the real one, not the twenty rows above it.
    const row = view.getByText(seeAll(total));
    expect(row).toBeTruthy();
    expect(view.getByText(seeAll(total))).toBeTruthy();
    expect(view.queryByText(seeAll(LEECH_LIST_LIMIT))).toBeNull();

    fireEvent.press(row);

    // `struggling` runs the same `isLeechWord` predicate this list ranks by, so
    // the sheet and the list it opens can never disagree about which words
    // qualify — only about how many are shown.
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: ROUTE_PATHS.PRACTICE_DICTIONARY,
      params: { scope: 'struggling' },
    });
  });

  test('the scope it navigates with is one the dictionary will actually accept', () => {
    // The bug this exists for: the row navigated with `struggling`, the screen
    // validated the param with `isNarrowScope` (horizon-*/depth-* only), and the
    // scope was silently dropped — so "See all 47" opened the entire vocabulary.
    // Asserting the navigation ARGUMENTS cannot catch that; the two sides have to
    // be checked against each other.
    givenLeeches(LEECH_LIST_LIMIT + 5);
    mockNavigate.mockClear();

    const view = render(<WordsToRevisitScreen />);
    fireEvent.press(view.getByText(seeAll(LEECH_LIST_LIMIT + 5)));

    const [{ params }] = mockNavigate.mock.calls[0] as [{ params: { scope: string } }];
    expect(isDictionaryScope(params.scope)).toBe(true);
  });

  test('a list that fits offers no way to see what it is already showing', () => {
    givenLeeches(LEECH_LIST_LIMIT - 1);

    const view = render(<WordsToRevisitScreen />);

    expect(view.queryByText(seeAll(LEECH_LIST_LIMIT - 1))).toBeNull();
  });

  test('exactly at the cap is not truncation', () => {
    // The boundary the `>` is there for: twenty leeches fill the list exactly,
    // so there is nothing on the other side of the tap.
    givenLeeches(LEECH_LIST_LIMIT);

    const view = render(<WordsToRevisitScreen />);

    expect(view.queryByText(seeAll(LEECH_LIST_LIMIT))).toBeNull();
  });
});
