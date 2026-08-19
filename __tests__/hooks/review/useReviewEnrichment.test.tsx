jest.unmock('@tanstack/react-query');

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { rootId } from '@/__tests__/helpers/ids';
import { useReviewExamples } from '@/hooks/review/useReviewExamples';
import { useReviewGlossAlternates } from '@/hooks/review/useReviewGlossAlternates';
import type { WordExample } from '@/services/sentences';
import type { StudyWord } from '@/types/vocabulary.types';

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({ wordNoun: '#111111' }),
}));

jest.mock('@/utils/arabicWordAnalysis', () => ({
  computeColoredSegments: jest.fn(() => []),
}));

jest.mock('@/services/sentences', () => ({
  sentencesService: {
    getExamplesForRoots: jest.fn(),
    getGlossAlternatesForRoots: jest.fn(),
  },
}));

const { sentencesService } = require('@/services/sentences');

function studyWord(id: number): StudyWord {
  return { root_id: rootId(id) } as StudyWord;
}

function example(id: number): WordExample {
  return {
    rootId: id,
    sentenceId: id * 10,
    arabic: `arabic-${id}`,
    english: `english-${id}`,
    audioUrl: null,
    wordForm: `word-${id}`,
    wordType: 'noun',
    words: [],
  };
}

describe('review enrichment batches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sentencesService.getExamplesForRoots.mockImplementation(async (ids: number[]) =>
      new Map(ids.map(id => [id, example(id)])),
    );
    sentencesService.getGlossAlternatesForRoots.mockImplementation(async (ids: number[]) =>
      new Map(ids.map(id => [id, [`gloss-${id}`]])),
    );
  });

  test('fetches each example batch once and retains earlier card context', async () => {
    const firstBatch = [studyWord(2), studyWord(1)];
    const { wrapper } = createHookTestWrapper();
    const { result, rerender } = renderHook(
      ({ batches }: { batches: readonly (readonly StudyWord[])[] }) =>
        useReviewExamples(batches),
      { initialProps: { batches: [firstBatch] }, wrapper },
    );

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledWith([rootId(1), rootId(2)]);

    // A grade can replace the arrays handed down by React, but immutable batch
    // identities keep the cached query stable.
    rerender({ batches: [[...firstBatch]] });
    await waitFor(() => expect(result.current.has(1)).toBeTruthy());
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledTimes(1);

    rerender({ batches: [[...firstBatch], [studyWord(3)]] });
    await waitFor(() => expect(result.current.size).toBe(3));
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledTimes(2);
    expect(sentencesService.getExamplesForRoots).toHaveBeenLastCalledWith([rootId(3)]);
    expect(result.current.get(1)?.english).toBe('english-1');
  });

  test('merges gloss alternates across refills without refetching old batches', async () => {
    const firstBatch = [studyWord(1), studyWord(2)];
    const { wrapper } = createHookTestWrapper();
    const { result, rerender } = renderHook(
      ({ batches }: { batches: readonly (readonly StudyWord[])[] }) =>
        useReviewGlossAlternates(batches),
      { initialProps: { batches: [firstBatch] }, wrapper },
    );

    await waitFor(() => expect(result.current.size).toBe(2));
    rerender({ batches: [[...firstBatch], [studyWord(3)]] });
    await waitFor(() => expect(result.current.size).toBe(3));

    expect(sentencesService.getGlossAlternatesForRoots).toHaveBeenCalledTimes(2);
    expect(result.current.get(1)).toEqual(['gloss-1']);
    expect(result.current.get(3)).toEqual(['gloss-3']);
  });
});
