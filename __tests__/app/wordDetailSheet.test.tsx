/**
 * `/word-detail` — one saved word, as a sheet that presents over any tab.
 *
 * The rules worth pinning:
 *
 * - It reports on a word the learner has ALREADY saved, so "not in your
 *   practice list" is a real outcome and must not read as a screen that never
 *   loaded. Both used to render an indefinite spinner on the word screen; this
 *   sheet inherits the fix, not the bug.
 * - The stats come from the same helpers the word screen uses, so the same word
 *   cannot report a different difficulty depending on which surface opened it.
 * - The way out is `dismissSheetThenNavigate`, never a bare push: iOS refuses to
 *   present from a controller that is still dismissing, so a push issued while
 *   the sheet slides away is dropped and the tap does nothing.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { LEECH_MIN_LAPSES } from '@/constants/fsrs';
import { getPracticeWordRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ rootId: '42' }),
}));

jest.mock('@/utils/sheetNavigation', () => ({
  dismissSheetThenNavigate: (...args: unknown[]) => mockNavigate(...args),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

const fsrs: { allWords: StudyWord[]; isLoading: boolean; error: Error | null } = {
  allWords: [],
  isLoading: false,
  error: null,
};

jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useFSRSQueries: () => fsrs,
}));

jest.mock('@/hooks/vocabulary/useRootEnrichment', () => ({
  useRootEnrichment: () => undefined,
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

const mockPlayAudio = jest.fn();
jest.mock('@/hooks/audio/useWordAudioPlayback', () => ({
  useWordAudioPlayback: () => mockPlayAudio,
}));

// eslint-disable-next-line import/first -- must be imported after the mocks above
import WordDetailSheet from '@/app/word-detail';

const savedWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
  createTestWord({
    root_id: rootId(42),
    fsrs_state: State.Review,
    fsrs_reps: 7,
    fsrs_lapses: LEECH_MIN_LAPSES + 2,
    fsrs_stability: 12,
    fsrs_difficulty: 8.2,
    root: {
      id: 42,
      letters: 'فَسَاد',
      meaning: 'corruption',
      audio_url: 'audio/fasad.mp3',
      audio_url_en: '',
    },
    ...overrides,
  });

const setFsrs = (next: Partial<typeof fsrs>): void => {
  Object.assign(fsrs, { allWords: [], isLoading: false, error: null }, next);
};

describe('WordDetailSheet', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPlayAudio.mockClear();
  });

  test('leads with the headword and its meaning', () => {
    setFsrs({ allWords: [savedWord()] });
    render(<WordDetailSheet />);

    expect(screen.getByText('فَسَاد')).toBeTruthy();
    expect(screen.getByText('Corruption')).toBeTruthy();
  });

  test('reports the FSRS stats for the word the route names', () => {
    setFsrs({ allWords: [savedWord()] });
    render(<WordDetailSheet />);

    expect(screen.getByText(STRINGS.WORD_STAT_DIFFICULTY)).toBeTruthy();
    expect(screen.getByText(STRINGS.WORD_STAT_NEXT_REVIEW)).toBeTruthy();
    // A word with lapses states them alongside the rep count — the number that
    // put it in the Explore rail in the first place.
    expect(
      screen.getByText(
        STRINGS.WORD_REVIEWS_WITH_LAPSES.replace('{count}', '7').replace(
          '{lapses}',
          String(LEECH_MIN_LAPSES + 2),
        ),
      ),
    ).toBeTruthy();
  });

  test('a word the learner has not saved says so, rather than spinning forever', () => {
    setFsrs({ allWords: [] });
    render(<WordDetailSheet />);

    expect(screen.getByText(STRINGS.WORD_NOT_FOUND)).toBeTruthy();
    expect(screen.queryByText(STRINGS.WORD_STAT_DIFFICULTY)).toBeNull();
  });

  test('a list still in flight is loading, not missing', () => {
    setFsrs({ allWords: [], isLoading: true });
    render(<WordDetailSheet />);

    expect(screen.queryByText(STRINGS.WORD_NOT_FOUND)).toBeNull();
  });

  test('a failed background refresh does not replace a word we already hold', () => {
    // `fsrsQueries.all` keeps refetching under this sheet. An error with data
    // still in the cache means the refresh failed, not that the word is gone —
    // swapping the word for an apology would be a regression the learner sees.
    setFsrs({ allWords: [savedWord()], error: new Error('network') });
    render(<WordDetailSheet />);

    expect(screen.getByText('فَسَاد')).toBeTruthy();
    expect(screen.queryByText(STRINGS.WORD_SHEET_ERROR)).toBeNull();
  });

  test('an error with nothing cached does report itself', () => {
    setFsrs({ allWords: [], error: new Error('network') });
    render(<WordDetailSheet />);

    expect(screen.getByText(STRINGS.WORD_SHEET_ERROR)).toBeTruthy();
  });

  test('the way out dismisses the sheet before navigating', () => {
    setFsrs({ allWords: [savedWord()] });
    render(<WordDetailSheet />);

    fireEvent.press(screen.getByText(STRINGS.WORD_SHEET_OPEN_IN_DICTIONARY));

    expect(mockNavigate).toHaveBeenCalledWith(getPracticeWordRoute(rootId(42)));
  });

  test('the audio control plays the root recording', () => {
    setFsrs({ allWords: [savedWord()] });
    render(<WordDetailSheet />);

    fireEvent.press(screen.getByLabelText(STRINGS.PLAY_AUDIO));

    expect(mockPlayAudio).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, audio_url: 'audio/fasad.mp3', letters: 'فَسَاد' }),
    );
  });

  test('no audio control for a word with no recording', () => {
    setFsrs({
      allWords: [
        savedWord({
          root: {
            id: 42,
            letters: 'فَسَاد',
            meaning: 'corruption',
            audio_url: '',
            audio_url_en: '',
          },
        }),
      ],
    });
    render(<WordDetailSheet />);

    expect(screen.queryByLabelText(STRINGS.PLAY_AUDIO)).toBeNull();
  });
});
