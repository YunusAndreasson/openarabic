/**
 * FSRSDataProvider Tests
 *
 * The provider exposes the user's full word list (`fsrsQueries.all`), and it
 * keeps the review session's due entry observed at the app root without
 * reading it — see the provider for why that keep-alive is load-bearing.
 */

jest.unmock('@tanstack/react-query');

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { FSRSDataProvider, useFSRSData } from '@/components/providers/FSRSDataProvider';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: jest.fn() },
}));

const getFSRSWords = jest.mocked(studyWordsFSRSService.getFSRSWords);

const ALL_WORDS: StudyWord[] = [
  createTestWord({ root_id: rootId(1) }),
  createTestWord({ root_id: rootId(2) }),
];

describe('FSRSDataProvider', () => {
  let queryClient: QueryClient;

  const wrapperFor =
    (userId: string | undefined) =>
    ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <FSRSDataProvider userId={userId}>{children}</FSRSDataProvider>
      </QueryClientProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    getFSRSWords.mockImplementation(async (_userId, options) =>
      options?.onlyDue ? [ALL_WORDS[0]!] : ALL_WORDS,
    );
  });

  test('provides the full word list', async () => {
    const { result } = renderHook(() => useFSRSData(), { wrapper: wrapperFor('user-1') });

    await waitFor(() => expect(result.current.studyWords).toEqual(ALL_WORDS));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('keeps the review session’s due entry observed, without reading it', async () => {
    renderHook(() => useFSRSData(), { wrapper: wrapperFor('user-1') });

    const dueKey = fsrsQueries.due('user-1', DEFAULT_SESSION_COOLDOWN_HOURS).queryKey;
    await waitFor(() => expect(queryClient.getQueryData(dueKey)).toEqual([ALL_WORDS[0]]));
    // Observed, so an invalidation refetches it straight away.
    expect(queryClient.getQueryCache().find({ queryKey: dueKey })?.getObserversCount()).toBe(1);

    getFSRSWords.mockClear();
    await fsrsQueries.invalidateAll(queryClient, 'user-1');
    expect(getFSRSWords).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ onlyDue: true }),
      expect.anything(),
    );
  });

  test('loading and error are the word list’s own, not the due entry’s', async () => {
    getFSRSWords.mockImplementation(async (_userId, options) => {
      if (options?.onlyDue) throw new Error('due failed');
      return ALL_WORDS;
    });

    const { result } = renderHook(() => useFSRSData(), { wrapper: wrapperFor('user-1') });

    await waitFor(() => expect(result.current.studyWords).toEqual(ALL_WORDS));
    expect(result.current.error).toBeNull();
  });

  test('a word-list failure is the context’s error', async () => {
    getFSRSWords.mockImplementation(async (_userId, options) => {
      if (options?.onlyDue) return [];
      throw Object.assign(new Error('Failed to load words'), { status: 403 });
    });

    const { result } = renderHook(() => useFSRSData(), { wrapper: wrapperFor('user-1') });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.studyWords).toBeUndefined();
  });

  test('fetches nothing without a user', () => {
    const { result } = renderHook(() => useFSRSData(), { wrapper: wrapperFor(undefined) });

    expect(getFSRSWords).not.toHaveBeenCalled();
    expect(result.current.studyWords).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  test('throws when used outside the provider', () => {
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useFSRSData());
    }).toThrow('useFSRSData must be used within an FSRSDataProvider');

    console.error = originalError;
  });

  test('memoizes the context value', async () => {
    const { result, rerender } = renderHook(() => useFSRSData(), {
      wrapper: wrapperFor('user-1'),
    });
    await waitFor(() => expect(result.current.studyWords).toEqual(ALL_WORDS));

    const firstValue = result.current;
    rerender(undefined);

    expect(result.current).toBe(firstValue);
  });
});
