// Unmock React Query to test real hook behavior
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { fsrsQueries } from '@/constants/queries';
import { useArticleWordInteractions } from '@/hooks/articles/useArticleWordInteractions';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import * as haptics from '@/utils/haptics';

// Mock auth hook
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    session: { user: { id: 'test-user-id' } },
    isLoading: false,
  }),
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

describe('useArticleWordInteractions', () => {
  let queryClient: QueryClient;
  let mockHandleRootPress: jest.Mock;
  let mockRefetchStudyWords: jest.Mock;

  const createMockWord = (id: number, rootId: number): SentenceWord => ({
    id,
    position: 0,
    word_form: `word-${id}`,
    english: `word-${id}`,
    difficulty_level: 1,
    grammar_note: null,
    root_id: rootId,
    sentence_id: 1,
    word_type_id: 1,
    root: null,
    word_type: null,
  });

  const createMockLayout = () => ({
    x: 10,
    y: 20,
    width: 100,
    height: 30,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockHandleRootPress = jest.fn().mockResolvedValue(true);
    mockRefetchStudyWords = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const { QueryClientProvider } = require('@tanstack/react-query');
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('initializes with no active tooltip and closed modal', () => {
    const { result } = renderHook(
      () =>
        useArticleWordInteractions({
          handleRootPress: mockHandleRootPress,
          refetchStudyWords: mockRefetchStudyWords,
        }),
      { wrapper },
    );

    expect(result.current.activeTooltip).toBeNull();
    expect(result.current.wordDetailsModal.isVisible).toBe(false);
    expect(result.current.wordDetailsModal.data).toBeNull();
    expect(result.current.isInStudyList).toBe(false);
  });

  describe('handleWordPress', () => {
    it('opens tooltip when word is pressed with valid layout', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);
      const layout = createMockLayout();

      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).toEqual({ word, layout });
    });

    it('closes tooltip when same word is pressed again', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);
      const layout = createMockLayout();

      // Open tooltip
      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).not.toBeNull();

      // Close tooltip by pressing same word
      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).toBeNull();
    });

    it('switches tooltip when different word is pressed', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word1 = createMockWord(1, 10);
      const word2 = createMockWord(2, 20);
      const layout = createMockLayout();

      // Open tooltip for word1
      act(() => {
        result.current.handleWordPress(word1, layout);
      });

      expect(result.current.activeTooltip?.word.id).toBe(1);

      // Switch to word2
      act(() => {
        result.current.handleWordPress(word2, layout);
      });

      expect(result.current.activeTooltip?.word.id).toBe(2);
    });

    it('does not open tooltip with invalid layout (width 0)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);
      const invalidLayout = { x: 0, y: 0, width: 0, height: 0 };

      act(() => {
        result.current.handleWordPress(word, invalidLayout);
      });

      expect(result.current.activeTooltip).toBeNull();
    });

    it('does not open tooltip without layout', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      act(() => {
        result.current.handleWordPress(word);
      });

      expect(result.current.activeTooltip).toBeNull();
    });
  });

  describe('handleCloseTooltip', () => {
    it('closes active tooltip', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);
      const layout = createMockLayout();

      // Open tooltip
      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).not.toBeNull();

      // Close tooltip
      act(() => {
        result.current.handleCloseTooltip();
      });

      expect(result.current.activeTooltip).toBeNull();
    });
  });

  describe('closeTooltipOnScroll', () => {
    it('closes tooltip when scroll starts', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);
      const layout = createMockLayout();

      // Open tooltip
      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).not.toBeNull();

      // Close on scroll
      act(() => {
        result.current.closeTooltipOnScroll();
      });

      expect(result.current.activeTooltip).toBeNull();
    });
  });

  describe('handleOpenWordDetails', () => {
    it('opens word details modal and closes tooltip', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);
      const layout = createMockLayout();

      // Open tooltip first
      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).not.toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBe(false);

      // Open word details
      act(() => {
        result.current.handleOpenWordDetails();
      });

      expect(result.current.activeTooltip).toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBe(true);
      expect(result.current.wordDetailsModal.data).toEqual(word);
    });

    it('does nothing if no tooltip is active', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      act(() => {
        result.current.handleOpenWordDetails();
      });

      expect(result.current.wordDetailsModal.isVisible).toBe(false);
    });
  });

  describe('handleAddWordToStudy', () => {
    it('adds word to study with haptic feedback', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      expect(haptics.selectionFeedback).toHaveBeenCalled();
      expect(mockHandleRootPress).toHaveBeenCalledWith(10);
      expect(mockRefetchStudyWords).toHaveBeenCalled();
    });

    it('updates local optimistic state immediately', async () => {
      mockHandleRootPress.mockResolvedValue(true);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      // Open word details modal
      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      expect(result.current.isInStudyList).toBe(false);

      // Close modal before adding
      act(() => {
        result.current.wordDetailsModal.close();
      });

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      // Re-open modal to check updated state
      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      // Should be true after adding
      expect(result.current.isInStudyList).toBe(true);
    });

    it('removes word from study when toggled off', async () => {
      mockHandleRootPress.mockResolvedValue(false);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      // First add it
      mockHandleRootPress.mockResolvedValue(true);
      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      // Open modal to check state
      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      expect(result.current.isInStudyList).toBe(true);

      // Now remove it
      mockHandleRootPress.mockResolvedValue(false);
      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      expect(result.current.isInStudyList).toBe(false);
    });

    it('refetches study words after mutation', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      // Check that refetch was called to update local component state
      // Note: Mutation handles all query invalidations, component just refetches
      expect(mockRefetchStudyWords).toHaveBeenCalled();
    });

    it('does nothing if user is not authenticated', async () => {
      // This test needs to run in isolation due to auth mock change
      // Create a separate hook test with no user
      const useAuthMock = require('@/hooks/auth/useAuth');
      const originalMock = useAuthMock.useAuth;

      useAuthMock.useAuth = jest.fn().mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
      });

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      expect(mockHandleRootPress).not.toHaveBeenCalled();

      // Restore original mock
      useAuthMock.useAuth = originalMock;
    });

    it('does nothing if word has no root_id', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const wordWithoutRoot = {
        ...createMockWord(1, 0),
        root_id: 0 as any, // Invalid root ID
      };

      await act(async () => {
        await result.current.handleAddWordToStudy(wordWithoutRoot);
      });

      expect(mockHandleRootPress).not.toHaveBeenCalled();
    });

    it('does nothing if handleRootPress returns undefined', async () => {
      mockHandleRootPress.mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      expect(mockHandleRootPress).toHaveBeenCalled();
      expect(mockRefetchStudyWords).not.toHaveBeenCalled();
    });
  });

  describe('isInStudyList', () => {
    it('checks local optimistic state first', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      // Set local state directly via handleAddWordToStudy
      mockHandleRootPress.mockResolvedValue(true);

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      // Open modal to check study state
      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      // Should use local state
      expect(result.current.isInStudyList).toBe(true);
    });

    it('falls back to query cache when no local state', () => {
      // Seed query cache with study words
      const studyWords: StudyWord[] = [
        {
          root_id: 10 as any,
          user_id: 'test-user-id' as any,
          fsrs_due: new Date().toISOString(),
          fsrs_stability: 1,
          fsrs_difficulty: 5,
          fsrs_scheduled_days: 0,
          fsrs_reps: 0,
          fsrs_learning_steps: 0,
          fsrs_lapses: 0,
          fsrs_state: 0,
          fsrs_last_review: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, studyWords);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 10);

      // Open modal
      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      // Should find word in query cache
      expect(result.current.isInStudyList).toBe(true);
    });

    it('returns false when word not in study list', () => {
      queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, []);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, 99);

      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      expect(result.current.isInStudyList).toBe(false);
    });

    it('returns false when modal has no data', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      expect(result.current.isInStudyList).toBe(false);
    });
  });

  describe('callback stability', () => {
    it('maintains stable callback references', () => {
      const { result, rerender } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const initialHandlers = {
        handleWordPress: result.current.handleWordPress,
        handleCloseTooltip: result.current.handleCloseTooltip,
        handleOpenWordDetails: result.current.handleOpenWordDetails,
        handleAddWordToStudy: result.current.handleAddWordToStudy,
        closeTooltipOnScroll: result.current.closeTooltipOnScroll,
      };

      // Trigger state change
      act(() => {
        result.current.handleWordPress(createMockWord(1, 10), createMockLayout());
      });

      rerender();

      // Callbacks should remain stable
      expect(result.current.handleWordPress).toBe(initialHandlers.handleWordPress);
      expect(result.current.handleCloseTooltip).toBe(initialHandlers.handleCloseTooltip);
      expect(result.current.handleOpenWordDetails).toBe(initialHandlers.handleOpenWordDetails);
      expect(result.current.handleAddWordToStudy).toBe(initialHandlers.handleAddWordToStudy);
      expect(result.current.closeTooltipOnScroll).toBe(initialHandlers.closeTooltipOnScroll);
    });
  });
});
