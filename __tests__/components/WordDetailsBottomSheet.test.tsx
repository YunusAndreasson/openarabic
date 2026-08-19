/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * Component test for WordDetailsBottomSheet optimistic state management
 *
 * Tests the dual optimistic state problem:
 * 1. Parent component (article/[id].tsx) maintains localStudyStates Map
 * 2. Child component (WordDetailsBottomSheet) maintains optimisticIsInStudyList state
 * 3. These can desynchronize, especially during rapid toggles
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { selectionFeedback } from '@/utils/haptics';

import { WordDetailsBottomSheet } from '@/components/article/WordDetailsBottomSheet';
import { STRINGS } from '@/constants/strings';
import type { SentenceWord } from '@/types/vocabulary.types';
import { rootId } from '@/__tests__/helpers/ids';

// Mock haptics at the utility level (not expo-haptics) since selectionFeedback
// has a shouldTriggerHaptic guard that blocks calls without a Redux store
jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

// Use shared mock factory from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);
// A STABLE spy, not a fresh jest.fn() per call — the toast assertions below
// need to see what the component actually announced.
const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/hooks/audio/useAudioSubscription', () => ({
  useAudioSubscription: () => ({
    status: {
      playing: false,
      isLoading: false,
      currentTrack: null,
    },
  }),
}));
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    stop: jest.fn(),
    play: jest.fn(),
    getStatus: jest.fn((..._args: unknown[]) => ({ playing: false, isLoading: false })),
  },
}));
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));
jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);

describe('WordDetailsBottomSheet - Optimistic State Management', () => {
  const mockWord: SentenceWord = {
    id: 1,
    sentence_id: 100,
    word_form: 'كَتَبَ',
    english: 'he wrote',
    root_id: rootId(42),
    audio_url: '/audio/word.mp3',
    grammar_note: 'Past tense verb',
    position: 1,
    difficulty_level: 1,
    word_type_id: 1,
    root: null,
    word_type: null,
  };

  const mockOnClose = jest.fn();
  const mockOnAddToStudy = jest.fn(async (..._args: unknown[]) => false);
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * The sheet used to announce "Saved to practice" BEFORE calling the mutation,
   * so a save the app then refused — by the due-backlog gate, or the daily
   * limit — still told the learner it had been saved.
   *
   * Reproduced on a real account with 1,491 words due: two taps, two "Saved to
   * practice" toasts, zero rows written. The claim must wait for the answer.
   */
  describe('never claims a save that did not happen', () => {
    test('confirms the save only after the write succeeds', async () => {
      let resolveAdd: (value: boolean) => void = () => undefined;
      mockOnAddToStudy.mockReturnValueOnce(
        new Promise<boolean>(resolve => {
          resolveAdd = resolve;
        }),
      );

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      fireEvent.press(getByText('Add to practice'));

      // Nothing is claimed while the write is still in flight.
      expect(mockShowToast).not.toHaveBeenCalledWith(STRINGS.WORD_ADDED_TO_PRACTICE);

      resolveAdd(true);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(STRINGS.WORD_ADDED_TO_PRACTICE);
      });
    });

    test('a refused add is never announced as saved', async () => {
      // What the due-backlog gate and the daily limit both return.
      mockOnAddToStudy.mockResolvedValueOnce(false);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      fireEvent.press(getByText('Add to practice'));

      // …and the word goes back to being offerable, rather than reading as saved.
      await waitFor(() => {
        expect(getByText('Add to practice')).toBeTruthy();
      });

      expect(mockShowToast).not.toHaveBeenCalledWith(STRINGS.WORD_ADDED_TO_PRACTICE);
    });

    test('a removal is still confirmed immediately — it cannot be refused', async () => {
      mockOnAddToStudy.mockResolvedValueOnce(true);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      fireEvent.press(getByText('In practice'));

      expect(mockShowToast).toHaveBeenCalledWith(STRINGS.WORD_QUICK_REMOVED);
    });
  });

  describe('Optimistic State Synchronization', () => {
    test('should initialize optimistic state from isInStudyList prop', () => {
      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // Button should show "Add to practice" initially
      expect(getByText('Add to practice')).toBeTruthy();
    });

    test('does not offer an add/remove action before persisted study state loads', () => {
      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
          isStudyStateLoading={true}
        />,
      );

      const loadingButton = getByText('Loading…');
      fireEvent.press(loadingButton);

      expect(mockOnAddToStudy).not.toHaveBeenCalled();
    });

    test('should sync optimistic state when isInStudyList prop changes', async () => {
      const { rerender, getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      expect(getByText('Add to practice')).toBeTruthy();

      // Change prop to true
      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      // Button should update to "In practice"
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });
    });

    test('should update optimistic state immediately on button press', async () => {
      mockOnAddToStudy.mockResolvedValue(true);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      const addButton = getByText('Add to practice');
      fireEvent.press(addButton);

      // Optimistic update should happen immediately
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'add');
      expect(selectionFeedback).toHaveBeenCalled();
    });
  });

  describe('Rapid Toggle State Desync', () => {
    /**
     * This used to assert that a rapid second press fired a SECOND mutation,
     * and the desync it is named for was the consequence: by the time the
     * second tap lands, the optimistic value has already flipped, so the tap
     * doesn't repeat the mutation — it computes the opposite `newValue` and
     * silently re-adds the word the learner just removed.
     *
     * The shared press lock in `useButtonPress` closes that window at the
     * source: a second press inside 300ms never reaches the handler, so there
     * is no second mutation and nothing to desync. The assertion is inverted
     * on purpose.
     */
    test('swallows a rapid second press instead of toggling back', async () => {
      let callCount = 0;
      mockOnAddToStudy.mockImplementation(async (): Promise<boolean> => {
        callCount++;
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      });

      const { getByText, rerender } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // First press: Add
      const addButton = getByText('Add to practice');
      fireEvent.press(addButton);

      // Immediately update prop to simulate parent state change
      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Second press, immediately, while the first mutation is still pending.
      const removeButton = getByText('In practice');
      fireEvent.press(removeButton);

      // Blocked by the press lock — the word stays added.
      await waitFor(() => {
        expect(callCount).toBe(1);
      });
      expect(getByText('In practice')).toBeTruthy();

      // And the parent's settled prop agrees with what the learner sees, which
      // is the desync this block is named for.
      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Let the delayed mutation settle before this test exits. Otherwise its
      // success toast can arrive after the next test has cleared the mocks,
      // making the suite depend on execution order.
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(STRINGS.WORD_ADDED_TO_PRACTICE);
      });
    });

    test('should rollback optimistic update on error', async () => {
      const mockError = new Error('Failed to add word');
      mockOnAddToStudy.mockRejectedValueOnce(mockError);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      const addButton = getByText('Add to practice');
      fireEvent.press(addButton);

      // Optimistic update happens immediately
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Wait for error and rollback
      await waitFor(() => {
        expect(getByText('Add to practice')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'add');
    });

    test('should rollback optimistic update when daily limit is reached', async () => {
      // Mock daily limit reached (onAddToStudy returns false)
      mockOnAddToStudy.mockResolvedValueOnce(false);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      const addButton = getByText('Add to practice');
      fireEvent.press(addButton);

      // Optimistic update happens immediately
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Wait for rollback when operation fails
      await waitFor(() => {
        expect(getByText('Add to practice')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'add');
    });
  });

  describe('Rapid double-tap on remove', () => {
    test('a second tap while the mutation is still pending is a no-op, not a re-add', async () => {
      let resolveMutation: ((value: boolean) => void) | undefined;
      mockOnAddToStudy.mockImplementation(
        () =>
          new Promise<boolean>(resolve => {
            resolveMutation = resolve;
          }),
      );

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      // First tap starts the remove — sheet stays open (see "stays open on
      // removal" above), so a fast second tap physically CAN land here.
      fireEvent.press(getByText('In practice'));

      await waitFor(() => {
        expect(mockOnAddToStudy).toHaveBeenCalledTimes(1);
      });

      // Second tap lands on the still-open, still-pending button. Without a
      // guard, `optimisticIsInStudyList` has already flipped to `false`, so
      // this would compute newValue=true and re-add the word the user just
      // asked to remove — a duplicate mutation that also inverts intent.
      fireEvent.press(getByText('Loading…'));

      resolveMutation?.(true);
      await waitFor(() => {
        expect(mockOnAddToStudy).toHaveBeenCalledTimes(1);
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'remove');
      expect(mockOnAddToStudy).not.toHaveBeenCalledWith(mockWord, 'add');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null word gracefully', () => {
      const { queryByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={null}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // Component should not render when word is null
      expect(queryByText('Add to practice')).toBeNull();
    });

    test('should not call onAddToStudy if word is null', async () => {
      const { rerender, queryByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // Update to null word
      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={null}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      expect(queryByText('Add to practice')).toBeNull();
      expect(mockOnAddToStudy).not.toHaveBeenCalled();
    });

    test('should preserve optimistic state during word changes', async () => {
      mockOnAddToStudy.mockResolvedValue(true);

      const { getByText, rerender } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // Press add button
      fireEvent.press(getByText('Add to practice'));

      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Change to different word with same root_id
      const differentWord: SentenceWord = {
        ...mockWord,
        id: 999,
        word_form: 'كَتَبْتُ',
        english: 'I wrote',
      };

      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={differentWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true} // Parent says it's in practice list
        />,
      );

      // Should show "In practice" based on prop
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });
    });
  });

  describe('Integration with Parent State', () => {
    test('should reflect parent state changes after successful mutation', async () => {
      mockOnAddToStudy.mockResolvedValue(true);

      const { getByText, rerender } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // User clicks "Add to practice"
      fireEvent.press(getByText('Add to practice'));

      // Optimistic update
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Parent updates prop after mutation completes
      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true} // Parent confirms word is in practice list
        />,
      );

      // State should remain consistent
      expect(getByText('In practice')).toBeTruthy();
    });

    test('should handle parent state lagging behind optimistic update', async () => {
      mockOnAddToStudy.mockImplementation(async (): Promise<boolean> => {
        // Simulate slow mutation
        await new Promise(resolve => setTimeout(resolve, 200));
        return true;
      });

      const { getByText, rerender } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // User clicks "Add to practice"
      fireEvent.press(getByText('Add to practice'));

      // Optimistic update happens immediately
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });

      // Parent hasn't updated yet (still false)
      rerender(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false} // Parent state is stale
        />,
      );

      // 🐛 BUG: This may cause the button to flicker or show wrong state
      // Optimistic state should take precedence until mutation completes

      // Wait for mutation to complete
      await waitFor(
        () => {
          expect(mockOnAddToStudy).toHaveBeenCalled();
        },
        { timeout: 300 },
      );
    });
  });

  // Onboarding promises "tap a word … then save it to practice". It used to take
  // three interactions because the sheet stayed open after a save and the user
  // had to dismiss it themselves.
  describe('Dismissal after saving', () => {
    test('closes itself once the word is added', async () => {
      mockOnAddToStudy.mockResolvedValue(true);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      fireEvent.press(getByText('Add to practice'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('stays open on removal, so a mistaken tap can be undone in place', async () => {
      mockOnAddToStudy.mockResolvedValue(true);

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      fireEvent.press(getByText('In practice'));

      await waitFor(() => {
        expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'remove');
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
