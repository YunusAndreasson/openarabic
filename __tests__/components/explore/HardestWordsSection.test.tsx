/**
 * The hardest-words rail on Explore.
 *
 * Three rules, and the last two are the ones that break quietly:
 *
 * 1. It self-hides. Explore has no skeletons and no empty states — every
 *    section on the tab renders `null` rather than explaining itself — so a
 *    learner with nothing to revisit must see a reading tab, not a band saying
 *    so. Loading and error take the same exit for the same reason.
 * 2. The rail is capped at ten, but the overflow card counts every leech. The
 *    revisit sheet and the practice tile both had to learn this: telling
 *    someone with 47 that they have 10 is a lie, and the two numbers disagree
 *    by design.
 * 3. The overflow card appears only when the rail actually truncated. Offering
 *    to "see all" the ten words already under the finger is a drill-down back
 *    to what you just read.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { LEECH_MIN_LAPSES } from '@/constants/fsrs';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

const mockPush = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

// Only `useQueryClient` is replaced. Mocking the whole module also removes
// `queryOptions`, which `rootEnrichmentQueries.detail` calls to build the very
// prefetch argument this suite is asserting on. `query`, not the deprecated
// `prefetchQuery` the source used to call — must resolve, since the source
// chains `.catch()` off it.
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<object>('@tanstack/react-query'),
  useQueryClient: () => ({
    query: (...args: unknown[]) => {
      mockPrefetch(...args);
      return Promise.resolve();
    },
  }),
}));

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

interface RevisitResult {
  leeches: StudyWord[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
}

const revisit: RevisitResult = { leeches: [], totalCount: 0, isLoading: false, isError: false };

jest.mock('@/hooks/vocabulary/useWordsToRevisit', () => ({
  useWordsToRevisit: () => revisit,
}));

// eslint-disable-next-line import/first -- must be imported after the mocks above
import { HardestWordsSection } from '@/components/explore/HardestWordsSection';

/** A word that qualifies as a leech: enough lapses, and actually practised. */
const leech = (id: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: State.Review,
    fsrs_reps: 5,
    fsrs_lapses: LEECH_MIN_LAPSES + id,
    root: {
      id,
      letters: `كلمة${id}`,
      meaning: 'corruption',
      audio_url: '',
      audio_url_en: '',
    },
  });

const setRevisit = (next: Partial<RevisitResult>): void => {
  Object.assign(revisit, { leeches: [], totalCount: 0, isLoading: false, isError: false }, next);
};

describe('HardestWordsSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPrefetch.mockClear();
  });

  test('renders nothing when the learner has no leeches', () => {
    setRevisit({ leeches: [], totalCount: 0 });
    render(<HardestWordsSection />);

    expect(screen.queryByText(STRINGS.SECTION_HARDEST_WORDS)).toBeNull();
  });

  test('renders nothing while loading, so the tab never shows a half-built rail', () => {
    setRevisit({ leeches: [leech(1)], totalCount: 1, isLoading: true });
    render(<HardestWordsSection />);

    expect(screen.queryByText(STRINGS.SECTION_HARDEST_WORDS)).toBeNull();
  });

  test('renders nothing on error rather than an error band on a reading tab', () => {
    setRevisit({ leeches: [leech(1)], totalCount: 1, isError: true });
    render(<HardestWordsSection />);

    expect(screen.queryByText(STRINGS.SECTION_HARDEST_WORDS)).toBeNull();
  });

  test('shows one card per leech, with its headword and meaning', () => {
    setRevisit({ leeches: [leech(3)], totalCount: 1 });
    render(<HardestWordsSection />);

    expect(screen.getByText(STRINGS.SECTION_HARDEST_WORDS)).toBeTruthy();
    expect(screen.getByText('كلمة3')).toBeTruthy();
    expect(screen.getByText('Corruption')).toBeTruthy();
  });

  test('does not print the lapse count on the card', () => {
    // The count is the sort key, not content: "Hardest right now" above the rail
    // has already said these are the ones being lost, so a per-card "4× forgot"
    // restates the heading on every card and reads as a scoreboard. It survives
    // where it is the subject — the revisit sheet, and the stat row in the sheet
    // this card opens.
    setRevisit({ leeches: [leech(3)], totalCount: 1 });
    render(<HardestWordsSection />);

    expect(
      screen.queryByText(STRINGS.FORGOT_N_TIMES.replace('{count}', String(LEECH_MIN_LAPSES + 3))),
    ).toBeNull();
  });

  test('caps the rail at ten cards even though the hook hands back more', () => {
    const words = Array.from({ length: 15 }, (_, index) => leech(index + 1));
    setRevisit({ leeches: words, totalCount: 15 });
    render(<HardestWordsSection />);

    expect(screen.getByText('كلمة10')).toBeTruthy();
    expect(screen.queryByText('كلمة11')).toBeNull();
  });

  test('the overflow card counts every leech, not the ten on screen', () => {
    const words = Array.from({ length: 12 }, (_, index) => leech(index + 1));
    setRevisit({ leeches: words, totalCount: 47 });
    render(<HardestWordsSection />);

    expect(
      screen.getByText(STRINGS.WORDS_TO_REVISIT_SEE_ALL.replace('{count}', '47')),
    ).toBeTruthy();
  });

  test('no overflow card when the rail is already showing everything', () => {
    const words = Array.from({ length: 4 }, (_, index) => leech(index + 1));
    setRevisit({ leeches: words, totalCount: 4 });
    render(<HardestWordsSection />);

    expect(screen.queryByText(/See all/)).toBeNull();
  });

  test('the overflow card opens the full revisit list', () => {
    const words = Array.from({ length: 12 }, (_, index) => leech(index + 1));
    setRevisit({ leeches: words, totalCount: 47 });
    render(<HardestWordsSection />);

    fireEvent.press(screen.getByText(STRINGS.WORDS_TO_REVISIT_SEE_ALL.replace('{count}', '47')));

    expect(mockPush).toHaveBeenCalledWith(ROUTE_PATHS.PRACTICE_WORDS_TO_REVISIT);
  });

  test('tapping a card prefetches its root explanation and opens the word sheet', () => {
    setRevisit({ leeches: [leech(9)], totalCount: 1 });
    render(<HardestWordsSection />);

    fireEvent.press(screen.getByText('كلمة9'));

    // Prefetched BEFORE the push, so the root panel is painted by the time the
    // sheet lands rather than a beat after it — and keyed to the SAME query the
    // sheet will read, or the warm-up warms nothing.
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['root-enrichment', 9] }),
    );
    expect(mockPush).toHaveBeenCalledWith('/word-detail?rootId=9');
  });
});
