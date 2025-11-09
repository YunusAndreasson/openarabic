/**
 * Component test for WordDetailsBottomSheet optimistic state management
 *
 * Tests the dual optimistic state problem:
 * 1. Parent component (article/[id].tsx) maintains localStudyStates Map
 * 2. Child component (WordDetailsBottomSheet) maintains optimisticIsInStudyList state
 * 3. These can desynchronize, especially during rapid toggles
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';

import { mockExpoHaptics } from '@/__tests__/setup/commonMocks';
import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { WordDetailsBottomSheet } from '@/components/article/WordDetailsBottomSheet';
import type { SentenceWord } from '@/types/vocabulary.types';

// Mock dependencies
mockExpoHaptics();
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    elevation1: '#FFFFFF',
    tint: '#8BC34A',
    primary: '#4CAF50',
    warning: '#FF9800',
    secondaryText: '#757575',
    text: '#212121',
    arabicText: '#000000',
    modalIndicator: '#BDBDBD',
    transparent: 'transparent',
    wordDueUnderline: '#FF5722',
    grammar: MOCK_GRAMMAR_COLORS,
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
jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
  useCurrentTheme: () => 'dark',
}));

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
    it('should initialize optimistic state from isInStudyList prop', () => {
      const { getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      // Button should show "ADD TO PRACTICE" initially (uppercase in rendered output)
      expect(getByText('ADD TO PRACTICE')).toBeTruthy();
    });

    it('should sync optimistic state when isInStudyList prop changes', async () => {
      const { rerender, getByText } = render(
        <WordDetailsBottomSheet
          isVisible={true}
          onClose={mockOnClose}
          word={mockWord}
          onAddToStudy={mockOnAddToStudy}
          isInStudyList={false}
        />,
      );

      expect(getByText('ADD TO PRACTICE')).toBeTruthy();

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

      // Button should update to "REMOVE FROM PRACTICE"
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
      });
    });

    it('should update optimistic state immediately on button press', async () => {
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

      const addButton = getByText('ADD TO PRACTICE');
      fireEvent.press(addButton);

      // Optimistic update should happen immediately
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord);
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });
  });

  describe('BUG: Rapid Toggle State Desync', () => {
    it('should handle rapid button presses without state desync', async () => {
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
      const addButton = getByText('ADD TO PRACTICE');
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
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
      });

      // Second press: Remove (while first operation still pending)
      const removeButton = getByText('REMOVE FROM PRACTICE');
      fireEvent.press(removeButton);

      // 🐛 BUG: Optimistic state may desync here
      // Expected: Button shows "ADD TO PRACTICE"
      // Actual (with bug): Button may still show "REMOVE FROM PRACTICE"

      await waitFor(() => {
        expect(getByText('ADD TO PRACTICE')).toBeTruthy();
      });

      expect(callCount).toBe(2);
    });

    it('should rollback optimistic update on error', async () => {
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

      const addButton = getByText('ADD TO PRACTICE');
      fireEvent.press(addButton);

      // Optimistic update happens immediately
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
      });

      // Wait for error and rollback
      await waitFor(() => {
        expect(getByText('ADD TO PRACTICE')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord);
    });

    it('should rollback optimistic update when daily limit is reached', async () => {
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

      const addButton = getByText('ADD TO PRACTICE');
      fireEvent.press(addButton);

      // Optimistic update happens immediately
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
      });

      // Wait for rollback when operation fails
      await waitFor(() => {
        expect(getByText('ADD TO PRACTICE')).toBeTruthy();
      });

      expect(mockOnAddToStudy).toHaveBeenCalledWith(mockWord);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null word gracefully', () => {
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
      expect(queryByText('ADD TO PRACTICE')).toBeNull();
    });

    it('should not call onAddToStudy if word is null', async () => {
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

      expect(queryByText('ADD TO PRACTICE')).toBeNull();
      expect(mockOnAddToStudy).not.toHaveBeenCalled();
    });

    it('should preserve optimistic state during word changes', async () => {
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
      fireEvent.press(getByText('ADD TO PRACTICE'));

      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
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

      // Should show "REMOVE FROM PRACTICE" based on prop
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
      });
    });
  });

  describe('Integration with Parent State', () => {
    it('should reflect parent state changes after successful mutation', async () => {
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

      // User clicks "ADD TO PRACTICE"
      fireEvent.press(getByText('ADD TO PRACTICE'));

      // Optimistic update
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
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
      expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
    });

    it('should handle parent state lagging behind optimistic update', async () => {
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

      // User clicks "ADD TO PRACTICE"
      fireEvent.press(getByText('ADD TO PRACTICE'));

      // Optimistic update happens immediately
      await waitFor(() => {
        expect(getByText('REMOVE FROM PRACTICE')).toBeTruthy();
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
