/**
 * One saved word, as the practice word screen and the `/word-detail` sheet both
 * load it. They used to load it separately, and the word screen also watched
 * the due queue it never read.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { useSavedWordDetail } from '@/hooks/vocabulary/useSavedWordDetail';
import type { StudyWord } from '@/types/vocabulary.types';

const queryKeys: unknown[] = [];
let mockAllWords: StudyWord[] = [];

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQuery: (options: { queryKey: unknown }) => {
    queryKeys.push(options.queryKey);
    return { data: mockAllWords, isLoading: false, error: null };
  },
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

jest.mock('@/hooks/vocabulary/useRootEnrichment', () => ({
  useRootEnrichment: () => undefined,
}));

jest.mock('@/hooks/audio/useWordAudioPlayback', () => ({
  useWordAudioPlayback: () => () => Promise.resolve(),
}));

jest.mock('@/hooks/theme/useDebouncedArabicFontSize', () => ({
  useDebouncedArabicFontSize: () => 20,
}));

const saved = (id: number) =>
  createTestWord({
    root_id: rootId(id),
    root: { id, letters: 'فَسَاد', meaning: 'corruption', audio_url: '', audio_url_en: '' },
  });

describe('useSavedWordDetail', () => {
  test('reads the saved-word list and nothing else', () => {
    queryKeys.length = 0;
    mockAllWords = [saved(42)];

    renderHook(() => useSavedWordDetail(rootId(42)));

    expect(queryKeys.length).toBeGreaterThan(0);
    for (const key of queryKeys) {
      expect(key).toEqual(['fsrs-words', 'test-user']);
    }
  });

  test('resolves the word and its lemma', () => {
    mockAllWords = [saved(42)];

    const { result } = renderHook(() => useSavedWordDetail(rootId(42)));

    expect(result.current.word?.root_id).toBe(rootId(42));
    expect(result.current.arabicText).toBe('فَسَاد');
    expect(result.current.englishText).toBe('Corruption');
  });

  // A remove deletes the word from the cache before the surface has closed;
  // the surface has to keep showing it while it goes.
  test('holds the word once the cache loses it', () => {
    mockAllWords = [saved(42)];
    const { result, rerender } = renderHook(() => useSavedWordDetail(rootId(42)));

    mockAllWords = [];
    rerender({});

    expect(result.current.word?.root_id).toBe(rootId(42));
  });

  test('a family member opens only when it is saved too', () => {
    mockAllWords = [saved(42), saved(7)];

    const { result } = renderHook(() => useSavedWordDetail(rootId(42)));

    expect(result.current.canOpenFamilyMember(rootId(7))).toBe(true);
    expect(result.current.canOpenFamilyMember(rootId(8))).toBe(false);
  });
});
