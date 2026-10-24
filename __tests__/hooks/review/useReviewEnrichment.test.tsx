import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { rootId } from '@/__tests__/helpers/ids';
import { reviewChunkQueries } from '@/constants/queries';
import { useReviewExamples } from '@/hooks/review/useReviewExamples';
import { useReviewGlossAlternates } from '@/hooks/review/useReviewGlossAlternates';
import { useReviewRootEnrichments } from '@/hooks/review/useReviewRootEnrichments';
import type { WordExample } from '@/services/sentences';
import type { RootEnrichment } from '@/types/rootEnrichment.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';
import * as errorHandling from '@/utils/errorHandling';
import { reportQueryFailure } from '@/utils/queryMeta';
import { SupabaseRequestError, type RequestOptions } from '@/utils/supabaseHelpers';

jest.mock('@/utils/errorHandling', () => ({ handleError: jest.fn() }));

let mockColors = { text: '#111111' };

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => mockColors,
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

jest.mock('@/services/rootEnrichment', () => ({
  rootEnrichmentService: {
    getByRootIds: jest.fn(),
  },
}));

const { sentencesService } = require('@/services/sentences');
const { rootEnrichmentService } = require('@/services/rootEnrichment');

/** Each chunk load is a managed request: the query cache owns its (silenced) report. */
const MANAGED = expect.objectContaining({ managed: true });

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
    words: [
      { position: 0, wordForm: `word-${id}`, english: `english-${id}`, rootId: id, isTarget: true },
    ],
  };
}

function enrichment(id: number): RootEnrichment {
  return {
    rootId: rootId(id),
    triliteralRoot: 'ق ل ب',
    rootTransliteration: 'q-l-b',
    rootMeaning: 'turn or change',
    headwordTransliteration: 'qalb',
    senses: [],
    wordFamily: [],
    usageNote: `root-story-${id}`,
    source: "Lane's Lexicon",
    sourceUrl: 'https://example.com',
  };
}

describe('review enrichment batches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockColors = { text: '#111111' };
    jest
      .mocked(computeColoredSegments)
      .mockImplementation((word, _english, colors) => [
        { text: word, color: colors.text, type: 'root' },
      ]);
    sentencesService.getExamplesForRoots.mockImplementation(
      async (ids: number[]) => new Map(ids.map(id => [id, example(id)])),
    );
    sentencesService.getGlossAlternatesForRoots.mockImplementation(
      async (ids: number[]) => new Map(ids.map(id => [id, [`gloss-${id}`]])),
    );
    rootEnrichmentService.getByRootIds.mockImplementation(
      async (ids: number[]) => new Map(ids.map(id => [id, enrichment(id)])),
    );
  });

  test('colors only new batch words across three refills and preserves earlier example identities', async () => {
    const batches = [
      [studyWord(1), studyWord(2)],
      [studyWord(3), studyWord(4)],
      [studyWord(5), studyWord(6)],
    ];
    const { wrapper } = createHookTestWrapper();
    const { result, rerender } = renderHook(
      ({ batches }: { batches: readonly (readonly StudyWord[])[] }) => useReviewExamples(batches),
      { initialProps: { batches: batches.slice(0, 1) }, wrapper },
    );

    await waitFor(() => expect(result.current.size).toBe(2));
    const firstExample = result.current.get(1);
    const counts = [jest.mocked(computeColoredSegments).mock.calls.length];
    rerender({ batches: batches.slice(0, 2) });
    await waitFor(() => expect(result.current.size).toBe(4));
    counts.push(jest.mocked(computeColoredSegments).mock.calls.length);
    rerender({ batches });
    await waitFor(() => expect(result.current.size).toBe(6));
    counts.push(jest.mocked(computeColoredSegments).mock.calls.length);

    expect(counts).toEqual([2, 4, 6]);
    expect(result.current.get(1)).toBe(firstExample);
    rerender({ batches: batches.map(batch => [...batch]) });
    expect(computeColoredSegments).toHaveBeenCalledTimes(6);
    expect(result.current.get(1)).toBe(firstExample);
  });

  test('recolors cached examples for a changed theme without refetching', async () => {
    const batches = [
      [studyWord(1), studyWord(2)],
      [studyWord(3), studyWord(4)],
      [studyWord(5), studyWord(6)],
    ];
    const { wrapper } = createHookTestWrapper();
    const { result, rerender } = renderHook(() => useReviewExamples(batches), { wrapper });

    await waitFor(() => expect(result.current.size).toBe(6));
    const firstExample = result.current.get(1);
    jest.mocked(computeColoredSegments).mockClear();
    mockColors = { text: '#222222' };
    rerender({});

    await waitFor(() =>
      expect(result.current.get(1)?.words[0]?.coloredSegments?.[0]?.color).toBe('#222222'),
    );

    expect(computeColoredSegments).toHaveBeenCalledTimes(6);
    expect(
      jest.mocked(computeColoredSegments).mock.calls.every(call => call[2] === mockColors),
    ).toBe(true);
    expect(result.current.get(1)).not.toBe(firstExample);
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledTimes(3);
  });

  test('fetches each example batch once and retains earlier card context', async () => {
    const firstBatch = [studyWord(2), studyWord(1)];
    const { wrapper } = createHookTestWrapper();
    const { result, rerender } = renderHook(
      ({ batches }: { batches: readonly (readonly StudyWord[])[] }) => useReviewExamples(batches),
      { initialProps: { batches: [firstBatch] }, wrapper },
    );

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledWith(
      [rootId(1), rootId(2)],
      MANAGED,
    );

    // A grade can replace the arrays handed down by React, but immutable batch
    // identities keep the cached query stable.
    rerender({ batches: [[...firstBatch]] });
    await waitFor(() => expect(result.current.has(1)).toBeTruthy());
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledTimes(1);

    rerender({ batches: [[...firstBatch], [studyWord(3)]] });
    await waitFor(() => expect(result.current.size).toBe(3));
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledTimes(2);
    expect(sentencesService.getExamplesForRoots).toHaveBeenLastCalledWith([rootId(3)], MANAGED);
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

  test('loads root stories once per batch and retains earlier explanations', async () => {
    const firstBatch = [studyWord(2), studyWord(1)];
    const { wrapper } = createHookTestWrapper();
    const { result, rerender } = renderHook(
      ({ batches }: { batches: readonly (readonly StudyWord[])[] }) =>
        useReviewRootEnrichments(batches),
      { initialProps: { batches: [firstBatch] }, wrapper },
    );

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(rootEnrichmentService.getByRootIds).toHaveBeenCalledWith(
      [rootId(1), rootId(2)],
      MANAGED,
    );

    rerender({ batches: [[...firstBatch], [studyWord(3)]] });
    await waitFor(() => expect(result.current.size).toBe(3));

    expect(rootEnrichmentService.getByRootIds).toHaveBeenCalledTimes(2);
    expect(rootEnrichmentService.getByRootIds).toHaveBeenLastCalledWith([rootId(3)], MANAGED);
    expect(result.current.get(1)?.usageNote).toBe('root-story-1');
  });

  // The hooks document these loads as silent — a card simply omits the block —
  // yet their service config toasted "Failed to load sentences" on every
  // failed attempt. The factories now say so to the query cache's reporter.
  test.each(['examples', 'glossAlternates', 'rootEnrichments'] as const)(
    'the %s chunk query is silent and never retried',
    name => {
      const options = reviewChunkQueries[name]({ rootIds: [rootId(1)], keySignature: '1' });

      expect(options.meta).toEqual({ silent: true });
      expect(options.retry).toBe(false);
    },
  );

  test('a failed chunk load reports nothing, even through the app-wide reporter', async () => {
    const handleError = jest.mocked(errorHandling.handleError);
    sentencesService.getExamplesForRoots.mockImplementation(
      async (_ids: number[], request?: RequestOptions) =>
        Promise.reject(
          new SupabaseRequestError(
            { message: 'boom', code: '', details: '', hint: '' },
            503,
            request?.managed ? { toastMessage: 'Failed to load sentences' } : undefined,
          ),
        ),
    );
    const queryClient = new QueryClient({
      queryCache: new QueryCache({
        onError: (error, query) => reportQueryFailure(error, query.meta),
      }),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useReviewExamples([[studyWord(1)]]), { wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryState(['review', 'examples', '1'])?.status).toBe('error'),
    );
    expect(result.current.size).toBe(0);
    expect(sentencesService.getExamplesForRoots).toHaveBeenCalledTimes(1);
    expect(handleError).not.toHaveBeenCalled();
    queryClient.clear();
  });
});
