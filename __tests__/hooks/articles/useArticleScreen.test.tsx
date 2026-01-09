/**
 * useArticleScreen Hook Tests
 *
 * Tests the main article screen orchestration hook which manages:
 * - Article data fetching and loading states
 * - Reading progress tracking with debouncing
 * - Scroll management and auto-scroll to last position
 * - Word interactions (tooltips, modal, study list)
 * - Reading list (bookmarks) toggle
 * - Navigation and cleanup
 * - Completion detection and locking
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: No test.concurrent() - tests share mock state and need isolation
 */

// Mock dependencies BEFORE imports
jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  },
}));
jest.mock('@/hooks/auth/useAuth');
jest.mock('@/hooks/articles/useArticleData');
jest.mock('@/hooks/articles/useReadingListMutations');
jest.mock('@/hooks/articles/useStudyWordMutations');
jest.mock('@/hooks/articles/useArticleWordInteractions');
jest.mock('@/hooks/articles/useReadingProgress');
jest.mock('@/utils/audioUtils');
jest.mock('@/utils/errorHandling');
jest.mock('@/utils/haptics');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState } from 'react-native';

import { useArticleScreen } from '@/hooks/articles/useArticleScreen';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { Tables } from '@/types/database.types';

const { router } = require('expo-router');
const { useAuth } = require('@/hooks/auth/useAuth');
const { useArticleData } = require('@/hooks/articles/useArticleData');
const { useReadingListMutations } = require('@/hooks/articles/useReadingListMutations');
const { useStudyWordMutations } = require('@/hooks/articles/useStudyWordMutations');
const { useArticleWordInteractions } = require('@/hooks/articles/useArticleWordInteractions');
const { useReadingProgress } = require('@/hooks/articles/useReadingProgress');
const { stopAudioSafely } = require('@/utils/audioUtils');
const { handleError } = require('@/utils/errorHandling');
const { selectionFeedback } = require('@/utils/haptics');

// Helper to create mock article
function createMockArticle(overrides: Partial<Tables<'articles'>> = {}): Tables<'articles'> {
  return {
    id: 1 as ArticleId,
    title: 'Test Article',
    source: 'Test Source',
    source_url: 'https://example.com',
    readability_score: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: 'test',
    ...overrides,
  } as Tables<'articles'>;
}

// Helper to create mock sentences
function createMockSentences(count: number): Tables<'article_sentences'>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    article_id: 1 as ArticleId,
    sentence_number: i,
    arabic_text: `Arabic sentence ${i}`,
    english_text: `English sentence ${i}`,
    created_at: new Date().toISOString(),
  })) as Tables<'article_sentences'>[];
}

describe('useArticleScreen Hook', () => {
  const mockShowToast = jest.fn();
  const mockUpdateProgress = jest.fn();
  const mockHandleToggleReadingList = jest.fn();
  const mockHandleRootPress = jest.fn();
  const mockHandleWordPress = jest.fn();
  const mockHandleCloseTooltip = jest.fn();
  const mockHandleOpenWordDetails = jest.fn();
  const mockHandleAddWordToStudy = jest.fn();
  const mockCloseTooltipOnScroll = jest.fn();
  const mockRefetchStudyWords = jest.fn();
  const mockRefetchReadingListStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AppState.addEventListener to return subscription with remove method
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as any);

    // Default mock implementations
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' },
    } as any);

    jest.mocked(useArticleData).mockReturnValue({
      article: createMockArticle(),
      isLoadingArticle: false,
      sortedSentences: createMockSentences(10),
      sentenceWordsMap: new Map(),
      refetchStudyWords: mockRefetchStudyWords,
      isInReadingList: false,
      refetchReadingListStatus: mockRefetchReadingListStatus,
    } as any);

    jest.mocked(useReadingListMutations).mockReturnValue({
      handleToggleReadingList: mockHandleToggleReadingList,
    } as any);

    jest.mocked(useStudyWordMutations).mockReturnValue({
      handleRootPress: mockHandleRootPress,
    } as any);

    jest.mocked(useArticleWordInteractions).mockReturnValue({
      activeTooltip: null,
      wordDetailsModal: { isOpen: false, rootId: null },
      isInStudyList: jest.fn(),
      wordDetailsEnabled: true,
      handleWordPress: mockHandleWordPress,
      handleCloseTooltip: mockHandleCloseTooltip,
      handleOpenWordDetails: mockHandleOpenWordDetails,
      handleAddWordToStudy: mockHandleAddWordToStudy,
      closeTooltipOnScroll: mockCloseTooltipOnScroll,
    } as any);

    jest.mocked(useReadingProgress).mockReturnValue({
      updateProgress: mockUpdateProgress,
      initialLastSentenceRead: 0,
      hadExistingProgressOnMount: false,
    } as any);

    jest.mocked(router.canGoBack).mockReturnValue(true);
    jest.mocked(router.back).mockImplementation(jest.fn());
    jest.mocked(router.push).mockImplementation(jest.fn());
    jest.mocked(stopAudioSafely).mockResolvedValue(undefined);
    jest.mocked(handleError).mockImplementation(jest.fn());
    jest.mocked(selectionFeedback).mockImplementation(jest.fn());
  });

  describe('Initialization & Setup', () => {
    test('parses valid article ID correctly', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '42',
          showToast: mockShowToast,
        }),
      );

      // Should have parsed article data
      expect(result.current.article).toBeDefined();
      expect(result.current.article?.id).toBe(1);
    });

    test('handles invalid article ID', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: 'invalid',
          showToast: mockShowToast,
        }),
      );

      // Should call useArticleData with undefined
      expect(useArticleData).toHaveBeenCalledWith(undefined, 'test-user');
    });

    test('handles empty article ID', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '',
          showToast: mockShowToast,
        }),
      );

      expect(useArticleData).toHaveBeenCalledWith(undefined, 'test-user');
    });

    test('initializes with loading state', () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: null,
        isLoadingArticle: true,
        sortedSentences: [],
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      expect(result.current.isLoadingArticle).toBeTruthy();
      expect(result.current.article).toBeNull();
    });

    test('initializes with article data', () => {
      const mockArticle = createMockArticle({ id: 123 as ArticleId, title: 'My Article' });

      jest.mocked(useArticleData).mockReturnValue({
        article: mockArticle,
        isLoadingArticle: false,
        sortedSentences: createMockSentences(5),
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: true,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '123',
          showToast: mockShowToast,
        }),
      );

      expect(result.current.article).toBe(mockArticle);
      expect(result.current.isInReadingList).toBeTruthy();
      expect(result.current.sortedSentences).toHaveLength(5);
    });

    test('handles undefined user', () => {
      jest.mocked(useAuth).mockReturnValue({
        user: undefined,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      // Should call useArticleData with undefined userId
      expect(useArticleData).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('Reading List Toggle', () => {
    test('toggles reading list and shows toast', async () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      await act(async () => {
        await result.current.handleToggleReadingListWithFeedback();
      });

      expect(mockHandleToggleReadingList).toHaveBeenCalledWith(1, false);
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 3000, ToastType.INFO);
      expect(selectionFeedback).toHaveBeenCalled();
    });

    test('does not toggle without article ID', async () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: null,
        isLoadingArticle: false,
        sortedSentences: [],
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: 'invalid',
          showToast: mockShowToast,
        }),
      );

      await act(async () => {
        await result.current.handleToggleReadingListWithFeedback();
      });

      expect(mockHandleToggleReadingList).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    test('shows correct toast when adding to reading list', async () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: createMockArticle(),
        isLoadingArticle: false,
        sortedSentences: createMockSentences(10),
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false, // Not in list
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      await act(async () => {
        await result.current.handleToggleReadingListWithFeedback();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('playlist'),
        3000,
        ToastType.INFO,
      );
    });

    test('shows correct toast when removing from reading list', async () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: createMockArticle(),
        isLoadingArticle: false,
        sortedSentences: createMockSentences(10),
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: true, // In list
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      await act(async () => {
        await result.current.handleToggleReadingListWithFeedback();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Removed'),
        3000,
        ToastType.INFO,
      );
    });
  });

  describe('Navigation & Close', () => {
    test('closes article and goes back when router can go back', async () => {
      jest.mocked(router.canGoBack).mockReturnValue(true);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(stopAudioSafely).toHaveBeenCalledWith(true);
      expect(router.back).toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    test('navigates to explore tab when router cannot go back', async () => {
      jest.mocked(router.canGoBack).mockReturnValue(false);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(stopAudioSafely).toHaveBeenCalledWith(true);
      expect(router.back).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/(tabs)/explore');
    });

    test('handles audio stop error gracefully', async () => {
      const error = new Error('Audio stop failed');
      jest.mocked(stopAudioSafely).mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      // Should not throw - error is handled internally
      await expect(
        act(async () => {
          await result.current.handleClose();
        }),
      ).resolves.not.toThrow();

      expect(handleError).toHaveBeenCalledWith(error, expect.any(Object));
      expect(router.back).toHaveBeenCalled(); // Should still navigate
    });
  });

  describe('Scroll Handling', () => {
    test('closes tooltip on scroll', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleScroll({} as any);
      });

      expect(mockCloseTooltipOnScroll).toHaveBeenCalled();
    });

    test('handleScrollEnd is a no-op', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      // Should not throw
      expect(() => result.current.handleScrollEnd()).not.toThrow();
    });

    test('handleFlashListLoad sets ready state', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleFlashListLoad();
      });

      // Should not throw and should mark FlashList as ready
      expect(() => result.current.handleFlashListLoad()).not.toThrow();
    });
  });

  describe('Viewable Items & Reading Progress', () => {
    test('updates current sentence index from viewable items', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      // Mark FlashList as ready and enable progress updates
      act(() => {
        result.current.handleFlashListLoad();
      });

      const viewableItems = [
        {
          index: 1, // FlashList index (0 is header)
          isViewable: true,
          item: {} as any,
        },
      ];

      act(() => {
        result.current.handleViewableItemsChanged({ viewableItems } as any);
      });

      // Current sentence index should be updated (index - 1 for header offset)
      expect(result.current.currentSentenceIndex).toBe(0);
    });

    test('ignores viewable items with no items', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      const initialIndex = result.current.currentSentenceIndex;

      act(() => {
        result.current.handleViewableItemsChanged({ viewableItems: [] } as any);
      });

      expect(result.current.currentSentenceIndex).toBe(initialIndex);
    });

    test('skips header item (index 0) in viewable items', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleFlashListLoad();
      });

      const viewableItems = [
        {
          index: 0, // Header
          isViewable: true,
          item: {} as any,
        },
        {
          index: 2, // First real sentence after header
          isViewable: true,
          item: {} as any,
        },
      ];

      act(() => {
        result.current.handleViewableItemsChanged({ viewableItems } as any);
      });

      // Should track index 2 - 1 = sentence 1 (skipping header at index 0)
      expect(result.current.currentSentenceIndex).toBe(1);
    });
  });

  describe('Completion Detection', () => {
    test('handleEndReached marks article as complete', () => {
      const mockSentences = createMockSentences(10);

      jest.mocked(useArticleData).mockReturnValue({
        article: createMockArticle(),
        isLoadingArticle: false,
        sortedSentences: mockSentences,
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleEndReached();
      });

      // Should update to last sentence (9)
      expect(result.current.currentSentenceIndex).toBe(9);
      expect(mockUpdateProgress).toHaveBeenCalledWith(9);
    });

    test('handleEndReached does nothing with no sentences', () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: createMockArticle(),
        isLoadingArticle: false,
        sortedSentences: [],
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleEndReached();
      });

      expect(mockUpdateProgress).not.toHaveBeenCalled();
    });

    test('handleRelatedArticlesVisible marks article as complete', () => {
      const mockSentences = createMockSentences(10);

      jest.mocked(useArticleData).mockReturnValue({
        article: createMockArticle(),
        isLoadingArticle: false,
        sortedSentences: mockSentences,
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleRelatedArticlesVisible();
      });

      // Should update to last sentence (9)
      expect(result.current.currentSentenceIndex).toBe(9);
      expect(mockUpdateProgress).toHaveBeenCalledWith(9);
    });
  });

  describe('Word Interactions', () => {
    test('exposes word interaction handlers', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      expect(result.current.handleWordPress).toBe(mockHandleWordPress);
      expect(result.current.handleCloseTooltip).toBe(mockHandleCloseTooltip);
      expect(result.current.handleOpenWordDetails).toBe(mockHandleOpenWordDetails);
      expect(result.current.handleAddWordToStudy).toBe(mockHandleAddWordToStudy);
    });

    test('exposes word interaction state', () => {
      jest.mocked(useArticleWordInteractions).mockReturnValue({
        activeTooltip: { rootId: 123, position: { x: 0, y: 0 } },
        wordDetailsModal: { isOpen: true, rootId: 456 },
        isInStudyList: jest.fn(),
        wordDetailsEnabled: false,
        handleWordPress: mockHandleWordPress,
        handleCloseTooltip: mockHandleCloseTooltip,
        handleOpenWordDetails: mockHandleOpenWordDetails,
        handleAddWordToStudy: mockHandleAddWordToStudy,
        closeTooltipOnScroll: mockCloseTooltipOnScroll,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      expect(result.current.activeTooltip).toEqual({ rootId: 123, position: { x: 0, y: 0 } });
      expect(result.current.wordDetailsModal).toEqual({ isOpen: true, rootId: 456 });
      expect(result.current.wordDetailsEnabled).toBeFalsy();
    });
  });

  describe('Cleanup & Effects', () => {
    test('stops audio on unmount', () => {
      const { unmount } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      unmount();

      expect(stopAudioSafely).toHaveBeenCalled();
    });

    test('refetches study words on app state change to active', async () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      // Simulate app state change
      const subscription = (AppState.addEventListener as jest.Mock).mock.calls[0][1];

      await act(async () => {
        await subscription('active');
      });

      expect(mockRefetchStudyWords).toHaveBeenCalled();
    });

    test('does not refetch when app state is not active', async () => {
      renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      const subscription = (AppState.addEventListener as jest.Mock).mock.calls[0][1];

      await act(async () => {
        await subscription('background');
      });

      expect(mockRefetchStudyWords).not.toHaveBeenCalled();
    });

    test('cleans up app state subscription on unmount', () => {
      const mockRemove = jest.fn();

      jest.mocked(AppState.addEventListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const { unmount } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });

    test('does not set up app state listener without user', () => {
      jest.mocked(useAuth).mockReturnValue({
        user: undefined,
      } as any);

      jest.mocked(AppState.addEventListener as jest.Mock).mockClear();

      renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      // Should not call addEventListener if no user
      expect(AppState.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('handles null article gracefully', () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: null,
        isLoadingArticle: false,
        sortedSentences: [],
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      expect(result.current.article).toBeNull();
      expect(result.current.sortedSentences).toEqual([]);
    });

    test('handles empty sentences array', () => {
      jest.mocked(useArticleData).mockReturnValue({
        article: createMockArticle(),
        isLoadingArticle: false,
        sortedSentences: [],
        sentenceWordsMap: new Map(),
        refetchStudyWords: mockRefetchStudyWords,
        isInReadingList: false,
        refetchReadingListStatus: mockRefetchReadingListStatus,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      expect(result.current.sortedSentences).toEqual([]);

      // Should not crash when calling completion handlers
      act(() => {
        result.current.handleEndReached();
        result.current.handleRelatedArticlesVisible();
      });
    });

    test('handles disableAutoScroll option', () => {
      jest.mocked(useReadingProgress).mockReturnValue({
        updateProgress: mockUpdateProgress,
        initialLastSentenceRead: 5,
        hadExistingProgressOnMount: true,
      } as any);

      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
          disableAutoScroll: true,
        }),
      );

      // With disableAutoScroll=true, should not trigger auto-scroll
      act(() => {
        result.current.handleFlashListLoad();
      });

      // Toast should not be shown for resume position
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    test('handles article change and resets state', () => {
      const { result, rerender } = renderHook(
        ({ id }) =>
          useArticleScreen({
            id,
            showToast: mockShowToast,
          }),
        { initialProps: { id: '1' } },
      );

      // Mark FlashList as ready
      act(() => {
        result.current.handleFlashListLoad();
      });

      // Change article ID
      rerender({ id: '2' });

      // State should be reset for new article
      // (This tests the useEffect with articleId dependency)
      // Hook should not crash and should accept new article ID
      expect(result.current).toBeDefined();
    });
  });

  describe('Debounced Progress Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('debounces progress updates by 1 second', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleFlashListLoad();
      });

      // Simulate viewable items change
      act(() => {
        result.current.handleViewableItemsChanged({
          viewableItems: [{ index: 3, isViewable: true, item: {} as any }],
        } as any);
      });

      // Should not update immediately
      expect(mockUpdateProgress).not.toHaveBeenCalled();

      // Fast-forward 500ms - still not called
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateProgress).not.toHaveBeenCalled();

      // Fast-forward another 500ms (total 1000ms) - now it should be called
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateProgress).toHaveBeenCalledWith(2); // index 3 - 1 = sentence 2
    });

    test('cancels pending progress update on rapid scroll', () => {
      const { result } = renderHook(() =>
        useArticleScreen({
          id: '1',
          showToast: mockShowToast,
        }),
      );

      act(() => {
        result.current.handleFlashListLoad();
      });

      // First scroll position
      act(() => {
        result.current.handleViewableItemsChanged({
          viewableItems: [{ index: 3, isViewable: true, item: {} as any }],
        } as any);
      });

      // Fast-forward 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Second scroll position before debounce completes
      act(() => {
        result.current.handleViewableItemsChanged({
          viewableItems: [{ index: 5, isViewable: true, item: {} as any }],
        } as any);
      });

      // Fast-forward another 1000ms
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should only be called once with the latest position
      expect(mockUpdateProgress).toHaveBeenCalledTimes(1);
      expect(mockUpdateProgress).toHaveBeenCalledWith(4); // index 5 - 1 = sentence 4
    });
  });
});
