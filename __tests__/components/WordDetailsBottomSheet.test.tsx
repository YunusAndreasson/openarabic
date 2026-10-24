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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { selectionFeedback } from '@/utils/haptics';

import { WordDetailsBottomSheet } from '@/components/article/WordDetailsBottomSheet';
import { STRINGS } from '@/constants/strings';
import type { RootEnrichment } from '@/types/rootEnrichment.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { rootId } from '@/__tests__/helpers/ids';

// The native close method starts an animation; it does not synchronously fire
// onClose. Drive completion separately so content-clear regressions are visible.
const mockSheetClose = jest.fn();
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const base = jest.requireActual('../../__mocks__/@gorhom/bottom-sheet');
  return {
    ...base,
    default: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ close: mockSheetClose, expand: jest.fn() }));
      return React.createElement(View, { ...props, testID: 'native-word-sheet' });
    }),
  };
});

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

// The sheet reports the learner's memory of the word, which reads the study-word
// cache through `useAuth`. Mocked at the hook rather than wrapped in providers:
// these tests are about the add/remove state machine, and the memory line has
// its own describe block below that drives this mock directly.
const mockStudyWord = jest.fn<StudyWord | undefined, [number | undefined]>(() => undefined);
jest.mock('@/hooks/vocabulary/useStudyWordByRoot', () => ({
  useStudyWordByRoot: (id: number | undefined) => mockStudyWord(id),
}));

// Same reasoning as the study-word mock above: the root explanation is a
// separate query, and these tests are about the add/remove state machine. It
// returns nothing by default, which is also the production default — most words
// have no entry.
const mockEnrichment = jest.fn<RootEnrichment | undefined, [number | undefined]>(() => undefined);
jest.mock('@/hooks/vocabulary/useRootEnrichment', () => ({
  useRootEnrichment: (id: number | undefined) => mockEnrichment(id),
}));

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

  /**
   * Stands in for a PERMITTED toggle. The real `handleRootPress` fires
   * `onAllowed` once the gates have passed and the quota is reserved — that
   * signal, not the resolved value, is what dismisses the sheet. A mock that
   * only resolves `true` silently models an add the gates never allowed.
   */
  const permitted =
    (result = true) =>
    async (..._args: unknown[]) => {
      (_args[2] as { onAllowed?: () => void } | undefined)?.onAllowed?.();
      return result;
    };
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

      await act(async () => {
        fireEvent.press(getByText('Add to practice'));
      });

      // …and the word goes back to being offerable, rather than reading as saved.
      expect(getByText('Add to practice')).toBeTruthy();

      expect(mockShowToast).not.toHaveBeenCalledWith(STRINGS.WORD_ADDED_TO_PRACTICE);
    });

    test('a removal is still confirmed immediately — it cannot be refused', async () => {
      mockOnAddToStudy.mockImplementationOnce(permitted());

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

    test('dispatches the add on press, with exactly one press haptic', async () => {
      mockOnAddToStudy.mockImplementation(permitted());

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

      // The button is held busy for the whole in-flight window now — that guard
      // is what stops a second tap inverting an add into a remove — so the
      // optimistic label is deliberately not observable between press and
      // settle. What the flip does is asserted through the settled state below.

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'add', expect.anything());
      // Exactly one. The press haptic belongs to ThemedButton
      // (hapticType="selection"); the sheet firing its own on top of the
      // button's made a single save buzz twice.
      expect(selectionFeedback).toHaveBeenCalledTimes(1);
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

      // The button is held busy for the whole in-flight window now — that guard
      // is what stops a second tap inverting an add into a remove — so the
      // optimistic label is deliberately not observable between press and
      // settle. What the flip does is asserted through the settled state below.

      // Wait for error and rollback
      await waitFor(() => {
        expect(getByText('Add to practice')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'add', expect.anything());
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

      // The button is held busy for the whole in-flight window now — that guard
      // is what stops a second tap inverting an add into a remove — so the
      // optimistic label is deliberately not observable between press and
      // settle. What the flip does is asserted through the settled state below.

      // Wait for rollback when operation fails
      await waitFor(() => {
        expect(getByText('Add to practice')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'add', expect.anything());
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

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'remove', expect.anything());
      expect(mockOnAddToStudy).not.toHaveBeenCalledWith(mockWord, 'add', expect.anything());
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

      // Retained content keeps its measured height during close, but can no
      // longer dispatch an action once the parent clears the selection.
      fireEvent.press(queryByText('Add to practice')!);
      expect(mockOnAddToStudy).not.toHaveBeenCalled();
    });

    test('should preserve optimistic state during word changes', async () => {
      mockOnAddToStudy.mockImplementation(permitted());

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

      // The button is held busy for the whole in-flight window now — that guard
      // is what stops a second tap inverting an add into a remove — so the
      // optimistic label is deliberately not observable between press and
      // settle. What the flip does is asserted through the settled state below.

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
      mockOnAddToStudy.mockImplementation(permitted());

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
      await act(async () => {
        fireEvent.press(getByText('Add to practice'));
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
      await waitFor(() => {
        expect(getByText('In practice')).toBeTruthy();
      });
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

      // The button is held busy for the whole in-flight window now — that guard
      // is what stops a second tap inverting an add into a remove — so the
      // optimistic label is deliberately not observable between press and
      // settle. What the flip does is asserted through the settled state below.

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
  /**
   * Dismissing the sheet is the strongest "done" signal the app has, so it must
   * follow the outcome rather than the tap. It used to fire unconditionally the
   * instant the button was pressed, so a refused save played out as: sheet
   * vanishes, button never visibly reverts, and the only correction is a toast
   * the user is now reading against the article they were returned to.
   */
  describe('Dismissal after saving', () => {
    test('stays open when the add is refused, and swallows a second tap', async () => {
      // A refusal never fires onAllowed.
      mockOnAddToStudy.mockImplementationOnce(async () => false);

      const { getByText, queryByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Add to practice'));
      });

      expect(mockOnClose).not.toHaveBeenCalled();
      // The refusal and the word it is about stay on screen together.
      expect(getByText('Add to practice')).toBeTruthy();
      expect(queryByText('In practice')).toBeNull();

      // The sheet now outlives a refused add, and the optimistic value flipped
      // while the write was in flight — so a second tap must not be read as the
      // OPPOSITE action and fire a remove for a word that was never saved.
      await act(async () => {
        fireEvent.press(getByText('Add to practice'));
      });
      expect(mockOnAddToStudy).not.toHaveBeenCalledWith(mockWord, 'remove', expect.anything());
    });

    test('animates an allowed save before clearing content, without waiting for the write', async () => {
      let resolveAdd: (value: boolean) => void = () => undefined;
      mockOnAddToStudy.mockImplementationOnce(
        async (..._args: unknown[]) =>
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

      await act(async () => {
        fireEvent.press(getByText('Add to practice'));
      });

      // Eligibility starts the native animation. Parent cleanup waits until
      // native completion, preserving content and its measured height.
      const options = mockOnAddToStudy.mock.calls[0]?.[2] as { onAllowed?: () => void } | undefined;
      expect(options?.onAllowed).toBeDefined();
      act(() => {
        options?.onAllowed?.();
      });
      expect(mockSheetClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getByText('he wrote')).toBeTruthy();
      fireEvent(screen.getByTestId('native-word-sheet'), 'close');
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveAdd(true);
      });
    });

    test.each(['different word', 'same word reopened'])(
      'ignores a late gate for %s',
      async mode => {
        let resolveAdd: (value: boolean) => void = () => undefined;
        mockOnAddToStudy.mockImplementationOnce(
          () =>
            new Promise<boolean>(resolve => {
              resolveAdd = resolve;
            }),
        );
        const props = {
          isVisible: true,
          onClose: mockOnClose,
          word: mockWord,
          onAddToStudy: mockOnAddToStudy,
          isInStudyList: false,
        };
        const { getByText, rerender } = render(<WordDetailsBottomSheet {...props} />);
        await act(async () => {
          fireEvent.press(getByText('Add to practice'));
        });
        const options = mockOnAddToStudy.mock.calls[0]?.[2] as { onAllowed?: () => void };
        if (mode === 'same word reopened') {
          rerender(<WordDetailsBottomSheet {...props} isVisible={false} word={null} />);
          rerender(<WordDetailsBottomSheet {...props} />);
        } else {
          rerender(<WordDetailsBottomSheet {...props} word={{ ...mockWord, id: 2 }} />);
        }
        mockSheetClose.mockClear();
        act(() => {
          options.onAllowed?.();
        });
        expect(mockSheetClose).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
        await act(async () => {
          resolveAdd(true);
        });
      },
    );

    test.each(['different word', 'same word reopened'])(
      'allows a save in %s while the previous save is paused',
      async mode => {
        let finishFirst: (value: boolean) => void = () => undefined;
        let finishSecond: (value: boolean) => void = () => undefined;
        mockOnAddToStudy
          .mockImplementationOnce((...args: unknown[]) => {
            (args[2] as { onAllowed?: () => void }).onAllowed?.();
            return new Promise<boolean>(resolve => {
              finishFirst = resolve;
            });
          })
          .mockImplementationOnce(
            () =>
              new Promise<boolean>(resolve => {
                finishSecond = resolve;
              }),
          );
        const props = {
          isVisible: true,
          onClose: mockOnClose,
          word: mockWord,
          onAddToStudy: mockOnAddToStudy,
          isInStudyList: false,
        };
        const { getByText, rerender } = render(<WordDetailsBottomSheet {...props} />);
        await act(async () => {
          fireEvent.press(getByText('Add to practice'));
        });
        expect(mockSheetClose).toHaveBeenCalledTimes(1);
        rerender(<WordDetailsBottomSheet {...props} isVisible={false} word={null} />);
        const nextWord =
          mode === 'same word reopened' ? mockWord : { ...mockWord, id: 2, root_id: rootId(43) };
        rerender(<WordDetailsBottomSheet {...props} word={nextWord} />);
        // Let the button's independent 300 ms double-tap lock expire, while
        // the offline mutation itself remains unresolved.
        act(() => {
          jest.advanceTimersByTime(500);
        });
        await act(async () => {
          fireEvent.press(getByText('Add to practice'));
        });
        expect(mockOnAddToStudy).toHaveBeenCalledTimes(2);
        expect(mockOnAddToStudy.mock.calls[1]?.[1]).toBe('add');
        // An older refusal must neither revert nor unlock the newer request.
        await act(async () => {
          finishFirst(false);
        });
        fireEvent.press(getByText(STRINGS.LOADING_GENERIC));
        expect(mockOnAddToStudy).toHaveBeenCalledTimes(2);
        await act(async () => {
          finishSecond(false);
        });
        expect(getByText('Add to practice')).toBeTruthy();
      },
    );

    test('hands no dismissal callback to a removal', async () => {
      mockOnAddToStudy.mockImplementationOnce(permitted());

      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={true}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('In practice'));
      });

      const options = mockOnAddToStudy.mock.calls[0]?.[2] as { onAllowed?: () => void } | undefined;
      expect(options?.onAllowed).toBeUndefined();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('requests the close animation once the word is allowed', async () => {
      mockOnAddToStudy.mockImplementation(permitted());

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
        expect(mockSheetClose).toHaveBeenCalled();
      });
    });

    test('stays open on removal, so a mistaken tap can be undone in place', async () => {
      mockOnAddToStudy.mockImplementation(permitted());

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
        expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord, 'remove', expect.anything());
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  /**
   * What the sheet says about a word the learner is already practising.
   *
   * A word practised forty times and one never seen used to render identically
   * here. One line fixes that; more than one line would turn a sheet whose job
   * is to keep you reading into a report.
   *
   * The gate is `hasBeenPractised`, not "is it saved" — a saved but unpractised
   * word carries PLACEHOLDER FSRS values (stability 0.4, a `fsrs_last_review`
   * stamped at save time), so a horizon drawn from them would be a claim about a
   * review that never happened. This is the single most re-broken rule in the
   * codebase.
   */
  describe('Memory line', () => {
    const practised = (): StudyWord =>
      ({
        root_id: 42,
        fsrs_state: 2,
        fsrs_reps: 12,
        fsrs_lapses: 0,
        fsrs_stability: 21,
        fsrs_difficulty: 5,
        fsrs_due: new Date(Date.now() + 86_400_000).toISOString(),
        fsrs_last_review: new Date(Date.now() - 86_400_000).toISOString(),
        created_at: new Date(Date.now() - 86_400_000).toISOString(),
      }) as StudyWord;

    const renderSheet = () =>
      render(
        <WordDetailsBottomSheet
          isVisible
          word={mockWord}
          onClose={jest.fn()}
          onAddToStudy={jest.fn(async () => true)}
        />,
      );

    test('says nothing about a word that is not in practice', () => {
      mockStudyWord.mockReturnValue(undefined);

      const { queryByText } = renderSheet();

      expect(queryByText(/holds for/)).toBeNull();
    });

    test('says nothing about a saved word with no review behind it', () => {
      // The placeholder trap: this word IS saved, so the button below reads
      // "In practice" — but its stability is a default, not a measurement.
      mockStudyWord.mockReturnValue({
        ...practised(),
        fsrs_state: 0,
        fsrs_reps: 0,
        fsrs_stability: 0.4,
      } as StudyWord);

      const { queryByText } = renderSheet();

      expect(queryByText(/holds for/)).toBeNull();
    });

    test('reports stage and horizon for a practised word', () => {
      mockStudyWord.mockReturnValue(practised());

      const { getByText } = renderSheet();

      // The same phrasing the word screen's panel uses, because both now read
      // `summaryLabel` off one derivation rather than each building their own.
      expect(getByText(/holds for 3 weeks/)).toBeTruthy();
    });

    test('looks the word up by its ROOT, not by the inflected form on screen', () => {
      mockStudyWord.mockClear();
      mockStudyWord.mockReturnValue(undefined);

      renderSheet();

      expect(mockStudyWord).toHaveBeenCalledWith(mockWord.root_id);
    });
  });

  /**
   * Where the word comes from.
   *
   * Two rules carry the design. It starts collapsed, because the sheet exists to
   * keep the learner reading and an etymology unfurled by default is a wall in
   * front of the text. And it is absent — not empty — for a word we have no
   * entry for, which is most of them: a row that exists only to announce a gap
   * would fire on nearly every tap.
   */
  describe('Root explanation', () => {
    const enrichment = (): RootEnrichment =>
      ({
        rootId: 42,
        triliteralRoot: 'ك ت ب',
        rootTransliteration: 'k-t-b',
        rootMeaning: 'to write, inscribe',
        headwordTransliteration: 'kataba',
        senses: [{ gloss: 'to write' }],
        wordFamily: [
          { letters: 'كِتَاب', transliteration: 'kitāb', meaning: 'book' },
          { letters: 'كَاتِب', transliteration: 'kātib', meaning: 'writer' },
          { letters: 'مَكْتَب', transliteration: 'maktab', meaning: 'desk, office' },
          { letters: 'مَكْتَبَة', transliteration: 'maktaba', meaning: 'library' },
        ],
        usageNote: 'The root runs through every word for writing and what is written.',
        source: "Lane's Arabic-English Lexicon",
        sourceUrl: 'https://lanelexicon.com/',
      }) as RootEnrichment;

    const renderSheet = () =>
      render(
        <WordDetailsBottomSheet
          isVisible
          word={mockWord}
          onClose={jest.fn()}
          onAddToStudy={jest.fn(async () => true)}
        />,
      );

    test('renders nothing at all for a word with no entry', () => {
      mockEnrichment.mockReturnValue(undefined);

      const { queryByText } = renderSheet();

      expect(queryByText(STRINGS.WORD_ROOT_SECTION_TITLE)).toBeNull();
      expect(queryByText(/to write, inscribe/)).toBeNull();
    });

    test('shows the whole record outright — nothing behind a chevron', () => {
      mockEnrichment.mockReturnValue(enrichment());

      const { getByText } = renderSheet();

      expect(getByText('ك ت ب')).toBeTruthy();
      // Both variants read the radicals the same way: transliteration + sense.
      expect(getByText(/k-t-b .* to write, inscribe/)).toBeTruthy();
      expect(getByText(STRINGS.WORD_ROOT_SECTION_TITLE)).toBeTruthy();
      expect(getByText(/runs through every word/)).toBeTruthy();
      expect(getByText(STRINGS.WORD_ROOT_FAMILY_TITLE)).toBeTruthy();
    });

    test('shows every family member, not a capped few', () => {
      // The sheet used to stop at three to stay short. What a word is built from
      // is why this panel exists, so the height was the wrong thing to protect.
      mockEnrichment.mockReturnValue(enrichment());

      const { getByText } = renderSheet();

      expect(getByText('book')).toBeTruthy();
      expect(getByText('writer')).toBeTruthy();
      expect(getByText('desk, office')).toBeTruthy();
      expect(getByText('library')).toBeTruthy();
    });

    test('drops senses and attribution, which belong to the full account', () => {
      // Senses are empty on all but a handful of records, and the citation is one
      // more line between the learner and the sentence they were reading.
      mockEnrichment.mockReturnValue(enrichment());

      const { queryByText } = renderSheet();

      expect(queryByText(STRINGS.WORD_ROOT_SENSES_TITLE)).toBeNull();
      expect(queryByText(/Lane's Arabic-English Lexicon/)).toBeNull();
    });

    test('shows a stated plural, which a learner cannot derive', () => {
      // Broken plurals are irregular by definition, so where Lane's gives one it
      // is the highest-value field on the row. The morphological pattern is
      // carried in the same record and deliberately not rendered.
      mockEnrichment.mockReturnValue({
        ...enrichment(),
        wordFamily: [
          { letters: 'كِتَاب', transliteration: 'kitāb', meaning: 'book', plural: 'كُتُب' },
        ],
      } as RootEnrichment);

      const { getByText } = renderSheet();

      expect(getByText(STRINGS.WORD_ROOT_PLURAL)).toBeTruthy();
      expect(getByText('كُتُب')).toBeTruthy();
    });

    test('looks the explanation up by root id', () => {
      mockEnrichment.mockClear();
      mockEnrichment.mockReturnValue(undefined);

      renderSheet();

      expect(mockEnrichment).toHaveBeenCalledWith(mockWord.root_id);
    });
  });

  describe('Sentence note', () => {
    const NOTE =
      'A past-tense verb in the causative pattern, the verb inside the simile. ' +
      'The subject is carried inside the verb, and it governs the object next.';

    const renderWithNote = (note: string | null) =>
      render(
        <WordDetailsBottomSheet
          isVisible
          word={{ ...mockWord, grammar_note: note }}
          onClose={jest.fn()}
          onAddToStudy={jest.fn(async () => true)}
        />,
      );

    beforeEach(() => {
      mockEnrichment.mockReturnValue(undefined);
    });

    test('renders nothing at all for a word with no note', () => {
      const { queryByText } = renderWithNote(null);

      expect(queryByText(STRINGS.WORD_SENTENCE_NOTE_TITLE)).toBeNull();
    });

    test('names the scope, so it cannot be read as a second opinion on the root', () => {
      // The two blocks on this card answer different questions — this one is
      // about the form in the sentence, the root block about the dictionary
      // entry. Unlabelled, as this was, they read as two takes on one word.
      const { getByText } = renderWithNote(NOTE);

      expect(getByText(STRINGS.WORD_SENTENCE_NOTE_TITLE)).toBeTruthy();
    });

    test('shows the note outright, in reach of a screen reader', () => {
      // It was briefly collapsed behind a labelled Pressable, which makes the row
      // one accessibility element and takes the note out of TalkBack's reach.
      const { getByText } = renderWithNote(NOTE);

      const note = getByText(NOTE);
      expect(note).toBeTruthy();
      expect(note.props.numberOfLines).toBeUndefined();
    });
  });
});
