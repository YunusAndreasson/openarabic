import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';

import { useReview } from '../../hooks/review';

jest.mock('../../components/review/ReviewCard', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onSwipeLeft, onSwipeRight }: any) => (
      <>
        <TouchableOpacity testID="swipe-left" onPress={onSwipeLeft} />
        <TouchableOpacity testID="swipe-right" onPress={onSwipeRight} />
        <Text testID="review-word" />
      </>
    ),
  };
});

jest.mock('../../components/review/CompletionScreen', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onClose, testID = 'completion-screen' }: any) => (
      <TouchableOpacity testID={testID} onPress={onClose} />
    ),
  };
});

jest.mock('../../components/review/ReviewHeader', () => () => null);
jest.mock('../../components/review/MeaningOverlay', () => () => null);
jest.mock('../../components/review/InstructionFooter', () => () => null);
jest.mock('../../components/vocabulary/WordManagementModal', () => () => null);
jest.mock('../../components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    ThemedView: ({ children }: any) => <View>{children}</View>,
  };
});

// Mock implementation of useReview with a long queue
jest.mock('../../hooks/review', () => {
  const WORD_COUNT = 1000;
  const words = Array.from({ length: WORD_COUNT }, (_, i) => `word-${i + 1}`);
  const state = { queue: [...words], isComplete: false };
  let onCloseCallback: (() => void) | null = null;

  const computeProgress = () =>
    ((words.length - state.queue.length) / words.length) * 100;

  const updateCompletion = () => {
    if (state.queue.length === 0) {
      state.isComplete = true;
    }
  };

  const handleSwipeLeft = jest.fn(() => {
    const word = state.queue.shift();
    if (word) state.queue.push(word);
    updateCompletion();
  });

  const handleSwipeRight = jest.fn(() => {
    state.queue.shift();
    updateCompletion();
  });

  const handleClose = jest.fn(() => {
    if (onCloseCallback) onCloseCallback();
  });

  return {
    __esModule: true,
    words,
    state,
    computeProgress,
    handleSwipeLeft,
    handleSwipeRight,
    useReview: ({ onClose } = {}) => {
      onCloseCallback = onClose ?? null;
      return {
        showMeaningOverlay: false,
        currentMeaning: '',
        currentSentence: { wordForm: state.queue[0] || '' },
        isTransitioningToCompletion: false,
        isComplete: state.isComplete,
        progress: computeProgress(),
        maxProgress: 100,
        progressAnimationKey: 0,
        wordFontSize: 20,
        currentWordKey: state.queue[0] || 'none',
        isVagueMeaning: false,
        isStruggling: false,
        handleSwipeLeft,
        handleSwipeRight,
        handleTap: jest.fn(),
        handleLongPress: jest.fn(),
        handleClose,
        animatedStyle: {},
        sessionMetrics: {},
        isUpdating: false,
        isWordManagementVisible: false,
        selectedWordForManagement: null,
        hideWordManagement: jest.fn(),
        handleRemoveFromStudy: jest.fn(),
        handleResetProgress: jest.fn(),
        handleSkipForToday: jest.fn(),
        handleMarkAsEasy: jest.fn(),
        handleMarkAsHard: jest.fn(),
      };
    },
  };
});

const { state, words, computeProgress, handleSwipeLeft, handleSwipeRight } = require('../../hooks/review');

function DummyReview({ onClose }: { onClose: () => void }) {
  const review = useReview({ onClose });
  return review.isComplete ? (
    <TouchableOpacity testID="completion-screen" onPress={review.handleClose} />
  ) : (
    <>
      <Text testID="current-word">{review.currentSentence.wordForm}</Text>
      <TouchableOpacity testID="swipe-left" onPress={review.handleSwipeLeft} />
      <TouchableOpacity testID="swipe-right" onPress={review.handleSwipeRight} />
    </>
  );
}

function PracticeFlow() {
  const [showReview, setShowReview] = React.useState(false);
  const [due, setDue] = React.useState(words.length);

  const handleClose = () => {
    setShowReview(false);
    setDue(due - words.length);
  };

  return showReview ? (
    <DummyReview onClose={handleClose} />
  ) : (
    <>
      <Text testID="due-count">{due}</Text>
      <TouchableOpacity testID="start" onPress={() => setShowReview(true)} />
    </>
  );
}

describe('visual practice session flow', () => {
  it('handles swipes and completion', () => {
    const { getByTestId, queryByTestId, rerender } = render(<PracticeFlow />);

    expect(getByTestId('due-count').props.children).toBe(words.length);

    // Start session
    fireEvent.press(getByTestId('start'));
    rerender(<PracticeFlow />);
    expect(queryByTestId('completion-screen')).toBeNull();
    expect(computeProgress()).toBe(0);

    // Mark first word unknown (re-added to queue)
    act(() => {
      fireEvent.press(getByTestId('swipe-left'));
    });
    rerender(<PracticeFlow />);
    expect(state.queue[state.queue.length - 1]).toBe('word-1');
    expect(computeProgress()).toBe(0);

    // Mark remaining words known
    for (let i = 0; i < words.length - 1; i++) {
      act(() => {
        fireEvent.press(getByTestId('swipe-right'));
      });
      rerender(<PracticeFlow />);
    }
    expect(computeProgress()).toBeCloseTo(99.9);

    // Last word (the requeued one)
    act(() => {
      fireEvent.press(getByTestId('swipe-right'));
    });
    rerender(<PracticeFlow />);
    expect(computeProgress()).toBe(100);

    expect(getByTestId('completion-screen')).toBeTruthy();
    expect(handleSwipeLeft).toHaveBeenCalledTimes(1);
    expect(handleSwipeRight).toHaveBeenCalledTimes(words.length);

    // Close completion screen
    act(() => {
      fireEvent.press(getByTestId('completion-screen'));
    });
    rerender(<PracticeFlow />);

    expect(getByTestId('due-count').props.children).toBe(0);
  });
});
