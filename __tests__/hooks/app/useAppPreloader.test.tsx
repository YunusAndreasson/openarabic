/**
 * useAppPreloader — the splash gate.
 *
 * `isLoaded` is what hides the splash, so every query the preload awaits has
 * to SETTLE — resolve or reject — even with no connection. A query that pauses
 * instead (a bare retry count, or networkMode 'online') used to hold the splash
 * until the network came back.
 */

jest.unmock('@tanstack/react-query');

import { act, renderHook } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { createPostgrestErrorMock } from '@/__tests__/helpers/serviceMocks';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { readingProgressService } from '@/services/readingProgress';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { retryWhileOnline } from '@/utils/queryRetry';
import { SupabaseRequestError } from '@/utils/supabaseHelpers';

jest.mock('@/services/supabase', () => ({
  supabase: { from: jest.fn() },
  checkAuthentication: jest.fn(),
}));
jest.mock('@/services/articles', () => ({
  articlesService: { getArticles: jest.fn(), getArticlesByIds: jest.fn() },
}));
jest.mock('@/services/categories', () => ({
  categoriesService: { getCategories: jest.fn() },
}));
jest.mock('@/services/readingProgress', () => ({
  readingProgressService: { getBulkProgress: jest.fn() },
}));
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: jest.fn() },
}));
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/hooks/articles/useMultipleFeaturedArticles', () => ({
  MAX_FEATURED_ARTICLES: 7,
}));
jest.mock('@/utils/runWhenIdle', () => ({ runWhenIdle: jest.fn() }));

/** What a request made with no connection resolves to, after executeQuery. */
const noConnection = () =>
  Promise.reject(
    new SupabaseRequestError(createPostgrestErrorMock('TypeError: Network request failed'), 0),
  );

describe('useAppPreloader splash gate', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.useFakeTimers();
    // The app's own query defaults (app/_layout.tsx): fetches pause while
    // offline, and the retry policy is the shared one.
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { networkMode: 'online', retry: retryWhileOnline(3), gcTime: Infinity },
      },
    });
    jest.mocked(articlesService.getArticles).mockImplementation(noConnection);
    jest.mocked(articlesService.getArticlesByIds).mockImplementation(noConnection);
    jest.mocked(categoriesService.getCategories).mockImplementation(noConnection);
    jest.mocked(readingProgressService.getBulkProgress).mockImplementation(noConnection);
    jest.mocked(studyWordsFSRSService.getFSRSWords).mockImplementation(noConnection);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    queryClient.clear();
    jest.useRealTimers();
  });

  const renderPreloader = () =>
    renderHook(() => useAppPreloader(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

  test('an offline cold start settles every awaited query and hides the splash', async () => {
    onlineManager.setOnline(false);
    const { result } = renderPreloader();

    await act(async () => {
      await result.current.preloadAppData();
    });

    expect(result.current.isLoaded).toBe(true);
    // Rejected on the first attempt — not left paused waiting for the network.
    expect(queryClient.getQueryState(['articles'])).toMatchObject({
      status: 'error',
      fetchStatus: 'idle',
    });
    expect(articlesService.getArticles).toHaveBeenCalledTimes(1);
  });

  test('an online failure is not retried on the splash path either', async () => {
    const { result } = renderPreloader();

    await act(async () => {
      await result.current.preloadAppData();
    });

    expect(result.current.isLoaded).toBe(true);
    expect(categoriesService.getCategories).toHaveBeenCalledTimes(1);
  });
});
