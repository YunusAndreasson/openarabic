/**
 * useAddCommonWords Hook Tests
 *
 * Regression coverage for the bulk "Add common words" quick-start reserving
 * today's daily-word-limit quota for what it actually adds — previously this
 * bulk path invalidated the study-word cache but never touched the daily
 * counter, so the per-word add path (article/dictionary) could add a full
 * SECOND daily allowance right on top of a quick-start.
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { useAddCommonWords } from '@/hooks/practice/useAddCommonWords';

const mockShowToast = jest.fn();
const mockGetCommonRoots = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockAddMultipleRoots = jest.fn(async (..._args: unknown[]) => 4);
const mockIncrementDailyWordCount = jest.fn(async (..._args: unknown[]) => true);
jest.mock('@/components/providers', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useDailyWordLimit: () => ({
    incrementDailyWordCount: mockIncrementDailyWordCount,
  }),
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getCommonRoots: (...args: unknown[]) => mockGetCommonRoots(...args),
    addMultipleRoots: (...args: unknown[]) => mockAddMultipleRoots(...args),
  },
}));

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn() },
}));

jest.mock('@/utils/onboardingStorage', () => ({
  markOnboardingStep: jest.fn(async (..._args: unknown[]) => undefined),
}));

jest.mock('@/utils/haptics', () => ({
  successFeedback: jest.fn(),
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

describe('useAddCommonWords', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    mockGetCommonRoots.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        letters: `w${i}`,
        meaning: `word ${i}`,
        audio_url: '',
        audio_url_en: '',
      })),
    );
    mockIncrementDailyWordCount.mockResolvedValue(true);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  test('reserves the daily quota once per word actually added', async () => {
    mockAddMultipleRoots.mockResolvedValue(4);

    const { result } = renderHook(() => useAddCommonWords(), { wrapper });

    await waitFor(() => expect(result.current.hasWordsAvailable).toBe(true));

    act(() => {
      result.current.addWords();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockIncrementDailyWordCount).toHaveBeenCalledTimes(4);
  });

  test('reserves nothing when every common word is already in study (addedCount 0)', async () => {
    mockAddMultipleRoots.mockResolvedValue(0);

    const { result } = renderHook(() => useAddCommonWords(), { wrapper });

    await waitFor(() => expect(result.current.hasWordsAvailable).toBe(true));

    act(() => {
      result.current.addWords();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockIncrementDailyWordCount).not.toHaveBeenCalled();
  });

  test('reserves a full 10 slots when the whole starter set is new', async () => {
    mockAddMultipleRoots.mockResolvedValue(10);

    const { result } = renderHook(() => useAddCommonWords(), { wrapper });

    await waitFor(() => expect(result.current.hasWordsAvailable).toBe(true));

    act(() => {
      result.current.addWords();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockIncrementDailyWordCount).toHaveBeenCalledTimes(10);
  });

  test('does not reserve quota when the mutation fails', async () => {
    mockAddMultipleRoots.mockRejectedValue(new Error('network failure'));

    const { result } = renderHook(() => useAddCommonWords(), { wrapper });

    await waitFor(() => expect(result.current.hasWordsAvailable).toBe(true));

    act(() => {
      result.current.addWords();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockIncrementDailyWordCount).not.toHaveBeenCalled();
  });
});
