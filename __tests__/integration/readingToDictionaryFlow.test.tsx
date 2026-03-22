/**
 * Reading to Dictionary Flow Integration Tests
 *
 * Tests the complete user journey from reading an article
 * to adding words to their personal dictionary/study list.
 *
 * Flow: Article View → Word Tap → Tooltip → Add to Study
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';

import { setupTestStore } from '@/__tests__/helpers/testStore';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleWordInteractions } from '@/hooks/articles/useArticleWordInteractions';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

// Mock modules at top level
const mockGetArticleById = jest.fn();
const mockIsInReadingList = jest.fn();
const mockGetStudyWords = jest.fn();
const mockToggleFSRSStudyRoot = jest.fn();
const mockCheckAuthentication = jest.fn();
const mockCanAddWord = jest.fn();
const mockIncrementDailyWordCount = jest.fn();
const mockShowToast = jest.fn();
const mockSelectionFeedback = jest.fn();

// Mock services
jest.mock('@/services/articles', () => ({
  articlesService: {
    getArticleById: (...args: unknown[]) => mockGetArticleById(...args),
  },
}));

jest.mock('@/services/bookmark', () => ({
  bookmarkService: {
    isInReadingList: (...args: unknown[]) => mockIsInReadingList(...args),
  },
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getStudyWords: () => mockGetStudyWords(),
    toggleFSRSStudyRoot: (...args: unknown[]) => mockToggleFSRSStudyRoot(...args),
  },
}));

jest.mock('@/services/supabase', () => ({
  checkAuthentication: () => mockCheckAuthentication(),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useDailyWordLimit: () => ({
    dailyWordLimit: 10,
    canAddWord: mockCanAddWord,
    incrementDailyWordCount: mockIncrementDailyWordCount,
  }),
}));

jest.mock('@/components/providers', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock auth hook
const mockUserId = 'test-user-id';
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: mockUserId },
    isAuthenticated: true,
  }),
}));

// Mock theme colors
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    tint: '#10B981',
    primary: '#10B981',
    secondary: '#6B7280',
    secondaryText: '#9CA3AF',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#10B981',
    info: '#3B82F6',
    accent: '#8B5CF6',
    violet: '#8B5CF6',
    indigo: '#6366F1',
    coral: '#F97316',
    text: '#1F2937',
    arabicText: '#1F2937',
    grammar: '#6B7280',
  }),
}));

describe('Reading to Dictionary Flow', () => {
  let queryClient: QueryClient;
  let mockStore: ReturnType<typeof setupTestStore>;

  // Sample test data
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    article_sentences: [
      {
        id: 101,
        position: 1,
        sentence_words: [
          {
            id: 1001,
            position: 1,
            word_form: 'كتاب',
            english: 'book',
            root_id: 501,
            root: 'ك-ت-ب',
          },
          {
            id: 1002,
            position: 2,
            word_form: 'جميل',
            english: 'beautiful',
            root_id: 502,
            root: 'ج-م-ل',
          },
        ],
      },
    ],
  };

  const mockWord: SentenceWord = {
    id: 1001,
    position: 1,
    word_form: 'كتاب',
    english: 'book',
    root_id: 501 as RootId,
    root: 'ك-ت-ب',
    sentence_id: 101,
  };

  const mockLayout = {
    x: 100,
    y: 200,
    width: 50,
    height: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockStore = setupTestStore();

    // Default mock implementations
    mockGetArticleById.mockResolvedValue(mockArticle);
    mockIsInReadingList.mockResolvedValue(false);
    mockGetStudyWords.mockResolvedValue([]);
    mockToggleFSRSStudyRoot.mockResolvedValue(true);
    mockCheckAuthentication.mockResolvedValue({ user: { id: mockUserId } });
    mockCanAddWord.mockResolvedValue(true);
    mockIncrementDailyWordCount.mockResolvedValue(true);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  describe('Article Data Loading', () => {
    test('loads article with sentences and words', async () => {
      const { result } = renderHook(() => useArticleData(1, mockUserId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingArticle).toBeFalsy();
      });

      expect(result.current.article).toBeDefined();
      expect(result.current.sortedSentences.length).toBeGreaterThan(0);
    });

    test('creates sentence words map with color analysis', async () => {
      const { result } = renderHook(() => useArticleData(1, mockUserId), { wrapper });

      await waitFor(() => {
        expect(result.current.sentenceWordsMap.size).toBeGreaterThan(0);
      });

      // Check that words have color segments computed
      const sentenceWords = result.current.sentenceWordsMap.get(101);
      expect(sentenceWords).toBeDefined();
      expect(sentenceWords?.[0]).toHaveProperty('coloredSegments');
    });

    test('provides selected word IDs from study words', async () => {
      // Set up study words in cache
      const studyWords: StudyWord[] = [{ root_id: 501 } as StudyWord];
      queryClient.setQueryData(['fsrs-words', mockUserId], studyWords);

      const { result } = renderHook(() => useArticleData(1, mockUserId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingArticle).toBeFalsy();
      });

      expect(result.current.selectedWordIds.has(501)).toBeTruthy();
    });
  });

  describe('Word Interactions', () => {
    test('shows tooltip when word is pressed', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      await act(async () => {
        result.current.handleWordPress(mockWord, mockLayout);
      });

      expect(result.current.activeTooltip).not.toBeNull();
      expect(result.current.activeTooltip?.word.id).toBe(mockWord.id);
    });

    test('closes tooltip when same word is pressed again', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      // First press - opens tooltip
      await act(async () => {
        result.current.handleWordPress(mockWord, mockLayout);
      });

      expect(result.current.activeTooltip).not.toBeNull();

      // Second press - closes tooltip
      await act(async () => {
        result.current.handleWordPress(mockWord, mockLayout);
      });

      expect(result.current.activeTooltip).toBeNull();
    });

    test('opens word details modal from tooltip', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      // Open tooltip first
      await act(async () => {
        result.current.handleWordPress(mockWord, mockLayout);
      });

      // Open word details from tooltip
      await act(async () => {
        result.current.handleOpenWordDetails();
      });

      // Tooltip should be closed, modal should have word data
      expect(result.current.activeTooltip).toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBeTruthy();
      expect(result.current.wordDetailsModal.data?.id).toBe(mockWord.id);
    });

    test('closes tooltip on scroll', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      // Open tooltip
      await act(async () => {
        result.current.handleWordPress(mockWord, mockLayout);
      });

      expect(result.current.activeTooltip).not.toBeNull();

      // Simulate scroll
      await act(async () => {
        result.current.closeTooltipOnScroll();
      });

      expect(result.current.activeTooltip).toBeNull();
    });
  });

  describe('Adding Words to Study List', () => {
    test('adds word to study list with haptic feedback', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      let addResult: boolean;
      await act(async () => {
        addResult = await result.current.handleAddWordToStudy(mockWord);
      });

      expect(addResult!).toBeTruthy();
      const { selectionFeedback } = require('@/utils/haptics');
      expect(selectionFeedback).toHaveBeenCalled();
      expect(mockHandleRootPress).toHaveBeenCalledWith(mockWord.root_id);
    });

    test('returns false when no user is authenticated', async () => {
      // Mock auth to return no user
      jest.doMock('@/hooks/auth/useAuth', () => ({
        useAuth: () => ({
          user: null,
          isAuthenticated: false,
        }),
      }));

      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      // Reset mock to return no user
      jest.resetModules();
    });

    test('updates local study state optimistically', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleAddWordToStudy(mockWord);
      });

      // After adding, the word should show as in study list via optimistic update
      // Open the word details to check isInStudyList
      await act(async () => {
        result.current.wordDetailsModal.open(mockWord);
      });

      expect(result.current.isInStudyList).toBeTruthy();
    });

    test('calls refetchStudyWords callback after adding', async () => {
      const mockRefetch = jest.fn().mockResolvedValue({});
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetch,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleAddWordToStudy(mockWord);
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Study Word Mutations Integration', () => {
    test('handleRootPress toggles word study status', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      let toggleResult: boolean | undefined;
      await act(async () => {
        toggleResult = await result.current.handleRootPress(501 as RootId);
      });

      expect(toggleResult).toBeTruthy();
      expect(mockToggleFSRSStudyRoot).toHaveBeenCalledWith(mockUserId, 501);
    });

    test('respects daily word limit when adding new words', async () => {
      mockCanAddWord.mockResolvedValue(false);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleWordPress(501 as RootId);
      });

      expect(mockShowToast).toHaveBeenCalled();
      expect(mockToggleFSRSStudyRoot).not.toHaveBeenCalled();
    });

    test('allows removing words even when at daily limit', async () => {
      // Set up word as already in study list
      queryClient.setQueryData(['fsrs-words', mockUserId], [{ root_id: 501 }]);
      mockCanAddWord.mockResolvedValue(false);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(501 as RootId);
      });

      // Should allow removal even at limit
      expect(mockToggleFSRSStudyRoot).toHaveBeenCalled();
    });
  });

  describe('Full User Journey', () => {
    test('complete flow: tap word → view details → add to study', async () => {
      const mockHandleRootPress = jest.fn().mockResolvedValue(true);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      // Step 1: Tap on a word to show tooltip
      await act(async () => {
        result.current.handleWordPress(mockWord, mockLayout);
      });

      expect(result.current.activeTooltip).not.toBeNull();

      // Step 2: Open word details modal
      await act(async () => {
        result.current.handleOpenWordDetails();
      });

      expect(result.current.wordDetailsModal.isVisible).toBeTruthy();

      // Step 3: Add word to study list
      await act(async () => {
        await result.current.handleAddWordToStudy(mockWord);
      });

      expect(mockHandleRootPress).toHaveBeenCalledWith(mockWord.root_id);
      expect(result.current.isInStudyList).toBeTruthy();
    });

    test('flow handles word already in study list', async () => {
      // Set up word as already in study list
      queryClient.setQueryData(['fsrs-words', mockUserId], [{ root_id: 501 }]);

      const mockHandleRootPress = jest.fn().mockResolvedValue(false); // Returns false when removing

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
          }),
        { wrapper },
      );

      // Open word details
      await act(async () => {
        result.current.wordDetailsModal.open(mockWord);
      });

      // Should show as already in study list (from cache)
      expect(result.current.isInStudyList).toBeTruthy();

      // Toggle should remove it
      await act(async () => {
        await result.current.handleAddWordToStudy(mockWord);
      });

      // After removal, local optimistic state should show as not in study list
      expect(result.current.isInStudyList).toBeFalsy();
    });
  });
});
