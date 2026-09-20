/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

// Unmock React Query to test real hook behavior
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { fsrsQueries } from '@/constants/queries';
import {
  useArticleWordInteractions,
  type UseArticleWordInteractionsOptions,
} from '@/hooks/articles/useArticleWordInteractions';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import * as haptics from '@/utils/haptics';
import { rootId } from '@/__tests__/helpers/ids';

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
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

// Mock toast — the hook shows a toast when the daily word limit is reached
const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// The hook subscribes to fsrsQueries.all via useQuery — mock the service so a
// test that doesn't pre-seed the cache resolves to an empty list immediately
// instead of falling through to the generic supabase-js mock's chainable
// builder (unrelated data shape, and an avoidable async round-trip per test).
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(async (..._args: unknown[]) => []),
  },
}));

describe('useArticleWordInteractions', () => {
  let queryClient: QueryClient;
  // Derived from the hook's own options type: a bare `jest.Mock` is
  // `Mock<UnknownFunction>`, which makes every `.mockResolvedValue()` below
  // unchecked and the mock unassignable to the option it fills.
  let mockHandleRootPress: jest.MockedFunction<
    UseArticleWordInteractionsOptions['handleRootPress']
  >;
  let mockRefetchStudyWords: jest.MockedFunction<
    NonNullable<UseArticleWordInteractionsOptions['refetchStudyWords']>
  >;

  const createMockWord = (id: number, root_id: RootId): SentenceWord => ({
    id,
    position: 0,
    word_form: `word-${id}`,
    english: `word-${id}`,
    difficulty_level: 1,
    grammar_note: null,
    audio_url: null,
    root_id,
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
    mockHandleRootPress = jest.fn(async (..._args: unknown[]) => true);
    mockRefetchStudyWords = jest.fn(async (..._args: unknown[]) => undefined);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const { QueryClientProvider } = require('@tanstack/react-query');
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  test('initializes with no active tooltip and closed modal', () => {
    const { result } = renderHook(
      () =>
        useArticleWordInteractions({
          handleRootPress: mockHandleRootPress,
          refetchStudyWords: mockRefetchStudyWords,
        }),
      { wrapper },
    );

    expect(result.current.activeTooltip).toBeNull();
    expect(result.current.wordDetailsModal.isVisible).toBeFalsy();
    expect(result.current.wordDetailsModal.data).toBeNull();
    expect(result.current.isInStudyList).toBeFalsy();
  });

  describe('handleWordPress', () => {
    test('opens the word details card directly by default (no tooltip)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const layout = createMockLayout();

      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBeTruthy();
      expect(result.current.wordDetailsModal.data).toEqual(word);
    });

    test('opens the word details card directly even without a layout', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      act(() => {
        result.current.handleWordPress(word);
      });

      expect(result.current.activeTooltip).toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBeTruthy();
      expect(result.current.wordDetailsModal.data).toEqual(word);
    });

    test('opens tooltip when word is pressed with valid layout (tooltip-first)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const layout = createMockLayout();

      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).toEqual({ word, layout });
      expect(result.current.wordDetailsModal.isVisible).toBeFalsy();
    });

    test('closes tooltip when same word is pressed again (tooltip-first)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
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

    test('switches tooltip when different word is pressed (tooltip-first)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word1 = createMockWord(1, rootId(10));
      const word2 = createMockWord(2, rootId(20));
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

    test('does not open tooltip with invalid layout (width 0) (tooltip-first)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const invalidLayout = { x: 0, y: 0, width: 0, height: 0 };

      act(() => {
        result.current.handleWordPress(word, invalidLayout);
      });

      expect(result.current.activeTooltip).toBeNull();
    });

    test('does not open tooltip without layout (tooltip-first)', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      act(() => {
        result.current.handleWordPress(word);
      });

      expect(result.current.activeTooltip).toBeNull();
    });
  });

  describe('handleCloseTooltip', () => {
    test('closes active tooltip', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
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

  describe('handleBackgroundPress', () => {
    // Safety net: if a word press ever fires without its paired background
    // press right behind it (the normal same-gesture pairing that consumes
    // the ref immediately), the flag must not stay stuck forever and
    // silently no-op some later, unrelated background tap.
    test('a word press with no paired background press self-clears via the timeout', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const layout = createMockLayout();

      act(() => {
        result.current.handleWordPress(word, layout);
      });
      expect(result.current.activeTooltip).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(0);
      });

      act(() => {
        result.current.handleBackgroundPress();
      });
      expect(result.current.activeTooltip).toBeNull();
    });

    // Regression: the article screen wraps the reading area in a
    // background-dismiss Pressable so tapping away from an open tooltip
    // closes it. A tap that lands ON a word fires that word's own onPress
    // AND the background wrapper's onPress in the same gesture dispatch —
    // handleBackgroundPress running after handleWordPress must not stomp the
    // tooltip the word press just opened/switched to. See
    // app/article/[id].tsx's background-dismiss Pressable.
    test('does not close the tooltip a word press just opened in the same tick', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const layout = createMockLayout();

      // Simulates the real dispatch order: the word's onPress fires, then the
      // wrapping background Pressable's onPress fires for the same gesture —
      // both within one synchronous handler, no re-render in between.
      act(() => {
        result.current.handleWordPress(word, layout);
        result.current.handleBackgroundPress();
      });

      expect(result.current.activeTooltip).toEqual({ word, layout });
    });

    // Regression: switching from one word's tooltip to a different word's
    // must not get closed by the same-tick background dismiss either.
    test('does not close the tooltip a word press just switched to in the same tick', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word1 = createMockWord(1, rootId(10));
      const word2 = createMockWord(2, rootId(20));
      const layout = createMockLayout();

      act(() => {
        result.current.handleWordPress(word1, layout);
        result.current.handleBackgroundPress();
      });
      expect(result.current.activeTooltip?.word.id).toBe(1);

      act(() => {
        result.current.handleWordPress(word2, layout);
        result.current.handleBackgroundPress();
      });
      expect(result.current.activeTooltip?.word.id).toBe(2);
    });

    test('closes the tooltip when a background tap is not preceded by a word press', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const layout = createMockLayout();

      act(() => {
        result.current.handleWordPress(word, layout);
        result.current.handleBackgroundPress();
      });
      expect(result.current.activeTooltip).not.toBeNull();

      // A later, separate background tap (its own gesture dispatch, no word
      // press alongside it) must still close the tooltip normally.
      act(() => {
        result.current.handleBackgroundPress();
      });
      expect(result.current.activeTooltip).toBeNull();
    });
  });

  describe('closeTooltipOnScroll', () => {
    test('closes tooltip when scroll starts', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
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
    test('opens word details modal and closes tooltip', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
            showTooltipFirst: true,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));
      const layout = createMockLayout();

      // Open tooltip first
      act(() => {
        result.current.handleWordPress(word, layout);
      });

      expect(result.current.activeTooltip).not.toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBeFalsy();

      // Open word details
      act(() => {
        result.current.handleOpenWordDetails();
      });

      expect(result.current.activeTooltip).toBeNull();
      expect(result.current.wordDetailsModal.isVisible).toBeTruthy();
      expect(result.current.wordDetailsModal.data).toEqual(word);
    });

    test('does nothing if no tooltip is active', () => {
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

      expect(result.current.wordDetailsModal.isVisible).toBeFalsy();
    });
  });

  describe('handleAddWordToStudy', () => {
    test('adds word to study without firing a second press haptic', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      // No haptic from this hook: the word sheet and long-press each fire their
      // own for the press, and firing a second made one save buzz twice.
      expect(haptics.selectionFeedback).not.toHaveBeenCalled();
      expect(mockHandleRootPress).toHaveBeenCalledWith(rootId(10), undefined, undefined);
      expect(mockRefetchStudyWords).toHaveBeenCalled();
    });

    // handleRootPress is the boundary to the real useStudyWordMutations
    // mutation, whose onMutate writes the optimistic value straight into the
    // fsrsQueries.all cache before the network call even resolves — so the
    // mock here writes to that same cache entry to stand in for it.
    test('reflects the study-word cache once the toggle mutation lands', async () => {
      mockHandleRootPress.mockImplementation(async (rootId: number) => {
        queryClient.setQueryData(
          fsrsQueries.all('test-user-id').queryKey,
          (old: StudyWord[] = []) => [...old, { root_id: rootId } as StudyWord],
        );
        return true;
      });

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      act(() => {
        result.current.wordDetailsModal.open(word);
      });
      expect(result.current.isInStudyList).toBeFalsy();

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      await waitFor(() => {
        expect(result.current.isInStudyList).toBeTruthy();
      });
    });

    test('removes word from study when toggled off', async () => {
      queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, [
        { root_id: 10 } as StudyWord,
      ]);
      mockHandleRootPress.mockImplementation(async (rootId: number) => {
        queryClient.setQueryData(
          fsrsQueries.all('test-user-id').queryKey,
          (old: StudyWord[] = []) => old.filter(w => w.root_id !== rootId),
        );
        return false;
      });

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      act(() => {
        result.current.wordDetailsModal.open(word);
      });
      expect(result.current.isInStudyList).toBeTruthy();

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      await waitFor(() => {
        expect(result.current.isInStudyList).toBeFalsy();
      });
    });

    test('refetches study words after mutation', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      // Check that refetch was called to update local component state
      // Note: Mutation handles all query invalidations, component just refetches
      expect(mockRefetchStudyWords).toHaveBeenCalled();
    });

    test('does nothing if user is not authenticated', async () => {
      // This test needs to run in isolation due to auth mock change
      // Create a separate hook test with no user
      const useAuthMock = require('@/hooks/auth/useAuth');
      const originalMock = useAuthMock.useAuth;

      useAuthMock.useAuth = jest.fn((..._args: unknown[]) => ({
        user: null,
        session: null,
        isLoading: false,
      }));

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      expect(mockHandleRootPress).not.toHaveBeenCalled();

      // Restore original mock
      useAuthMock.useAuth = originalMock;
    });

    test('does nothing if word has no root_id', async () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const wordWithoutRoot = {
        ...createMockWord(1, rootId(0)),
        root_id: 0 as any, // Invalid root ID
      };

      await act(async () => {
        await result.current.handleAddWordToStudy(wordWithoutRoot);
      });

      expect(mockHandleRootPress).not.toHaveBeenCalled();
    });

    test('does nothing if handleRootPress returns undefined', async () => {
      mockHandleRootPress.mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      await act(async () => {
        await result.current.handleAddWordToStudy(word);
      });

      expect(mockHandleRootPress).toHaveBeenCalled();
      expect(mockRefetchStudyWords).not.toHaveBeenCalled();
    });
  });

  describe('isInStudyList', () => {
    // Regression test: this hook used to keep its own local `Map<RootId,
    // boolean>` of "already saved" state, checked BEFORE the query cache and
    // never reconciled with it. A word toggled through a completely
    // different useStudyWordMutations instance — e.g. removed from the
    // Practice dictionary list while this article screen stayed mounted in
    // the background — left that local Map stale, so the article's
    // word-detail sheet kept showing "Remove from Practice" for a word that
    // was no longer saved. Reading fsrsQueries.all reactively (no local
    // Map of its own) means an external mutation is reflected immediately,
    // with nothing here that CAN go stale.
    test('reflects a word toggled by a different mutation instance without a remount', async () => {
      queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, []);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(10));

      act(() => {
        result.current.wordDetailsModal.open(word);
      });
      expect(result.current.isInStudyList).toBeFalsy();

      // Simulate another screen's mutation adding the word — this hook never
      // called handleAddWordToStudy for it.
      await act(async () => {
        queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, [
          { root_id: 10 } as StudyWord,
        ]);
      });
      await waitFor(() => {
        expect(result.current.isInStudyList).toBeTruthy();
      });

      // ...and removed again, same external path.
      await act(async () => {
        queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, []);
      });
      await waitFor(() => {
        expect(result.current.isInStudyList).toBeFalsy();
      });
    });

    test('falls back to query cache when no local state', () => {
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

      const word = createMockWord(1, rootId(10));

      // Open modal
      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      // Should find word in query cache
      expect(result.current.isInStudyList).toBeTruthy();
    });

    test('returns false when word not in study list', () => {
      queryClient.setQueryData(fsrsQueries.all('test-user-id').queryKey, []);

      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      const word = createMockWord(1, rootId(99));

      act(() => {
        result.current.wordDetailsModal.open(word);
      });

      expect(result.current.isInStudyList).toBeFalsy();
    });

    test('returns false when modal has no data', () => {
      const { result } = renderHook(
        () =>
          useArticleWordInteractions({
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          }),
        { wrapper },
      );

      expect(result.current.isInStudyList).toBeFalsy();
    });
  });

  describe('callback stability', () => {
    test('maintains stable callback references', () => {
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
        handleWordLongPress: result.current.handleWordLongPress,
        handleCloseTooltip: result.current.handleCloseTooltip,
        handleOpenWordDetails: result.current.handleOpenWordDetails,
        handleAddWordToStudy: result.current.handleAddWordToStudy,
        closeTooltipOnScroll: result.current.closeTooltipOnScroll,
      };

      // Trigger state change
      act(() => {
        result.current.handleWordPress(createMockWord(1, rootId(10)), createMockLayout());
      });

      rerender(undefined);

      // Callbacks should remain stable
      expect(result.current.handleWordPress).toBe(initialHandlers.handleWordPress);
      expect(result.current.handleWordLongPress).toBe(initialHandlers.handleWordLongPress);
      expect(result.current.handleCloseTooltip).toBe(initialHandlers.handleCloseTooltip);
      expect(result.current.handleOpenWordDetails).toBe(initialHandlers.handleOpenWordDetails);
      expect(result.current.handleAddWordToStudy).toBe(initialHandlers.handleAddWordToStudy);
      expect(result.current.closeTooltipOnScroll).toBe(initialHandlers.closeTooltipOnScroll);
    });

    test('keeps long-press stable while using the latest mutation callback', async () => {
      const replacementHandleRootPress = jest.fn(async (..._args: unknown[]) => true);
      const replacementRefetch = jest.fn(async (..._args: unknown[]) => undefined);
      type CallbackProps = {
        handleRootPress: UseArticleWordInteractionsOptions['handleRootPress'];
        refetchStudyWords: NonNullable<UseArticleWordInteractionsOptions['refetchStudyWords']>;
      };

      const { result, rerender } = renderHook<
        ReturnType<typeof useArticleWordInteractions>,
        CallbackProps
      >(
        ({ handleRootPress, refetchStudyWords }) =>
          useArticleWordInteractions({ handleRootPress, refetchStudyWords }),
        {
          wrapper,
          initialProps: {
            handleRootPress: mockHandleRootPress,
            refetchStudyWords: mockRefetchStudyWords,
          },
        },
      );
      const initialLongPress = result.current.handleWordLongPress;

      rerender({
        handleRootPress: replacementHandleRootPress,
        refetchStudyWords: replacementRefetch,
      });

      expect(result.current.handleWordLongPress).toBe(initialLongPress);

      await act(async () => {
        await result.current.handleWordLongPress(createMockWord(1, rootId(10)));
      });

      expect(replacementHandleRootPress).toHaveBeenCalledWith(rootId(10), 'add', undefined);
      expect(replacementRefetch).toHaveBeenCalledTimes(1);
      expect(mockHandleRootPress).not.toHaveBeenCalled();
    });
  });
});
