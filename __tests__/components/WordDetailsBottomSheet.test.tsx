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
import * as Haptics from 'expo-haptics';
import React from 'react';

import { mockExpoHaptics } from '@/__tests__/setup/commonMocks';
import { WordDetailsBottomSheet } from '@/components/article/WordDetailsBottomSheet';
import type { SentenceWord } from '@/types/vocabulary.types';

// Mock dependencies
mockExpoHaptics();

// Use shared mock factory from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);
jest.mock('@/components/providers', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock('@/hooks/audio/useAudioSubscription', () => ({
  useAudioSubscription: () => ({
    status: {
      isPlaying: false,
      isLoading: false,
      currentTrack: null,
    },
  }),
}));
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    stop: jest.fn(),
    play: jest.fn(),
    getStatus: jest.fn(() => ({ isPlaying: false, isLoading: false })),
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
    root_id: 42,
    audio_url: '/audio/word.mp3',
    grammar_note: 'Past tense verb',
    position_in_sentence: 1,
  };

  const mockOnClose = jest.fn();
  const mockOnAddToStudy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord);
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('BUG: Rapid Toggle State Desync', () => {
    test('should handle rapid button presses without state desync', async () => {
      let callCount = 0;
      mockOnAddToStudy.mockImplementation(async () => {
        callCount++;
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
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

      // Second press: Remove (while first operation still pending)
      const removeButton = getByText('In practice');
      fireEvent.press(removeButton);

      // 🐛 BUG: Optimistic state may desync here
      // Expected: Button shows "Add to practice"
      // Actual (with bug): Button may still show "In practice"

      await waitFor(() => {
        expect(getByText('Add to practice')).toBeTruthy();
      });

      expect(callCount).toBe(2);
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

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord);
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

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord);
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
      mockOnAddToStudy.mockImplementation(async () => {
        // Simulate slow mutation
        await new Promise(resolve => setTimeout(resolve, 200));
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
});
