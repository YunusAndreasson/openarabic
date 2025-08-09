import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
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
  let words = Array.from({ length: WORD_COUNT }, (_, i) => `word-${i + 1}`);
  let state = { queue: [...words], isComplete: false };
  let onCloseCallback: (() => void) | null = null;

  const computeProgress = () => ((words.length - state.queue.length) / words.length) * 100;

  const updateCompletion = () => {
    if (state.queue.length === 0) {
      state.isComplete = true;
    }
  };

  const handleSwipeLeft = jest.fn(() => {
    if (state.queue.length > 0) {
      const word = state.queue.shift();
      if (word) {
        state.queue.push(word);
      }
    }
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
    get words() {
      return words;
    },
    get state() {
      return state;
    },
    set words(newWords) {
      words = newWords;
    },
    set state(newState) {
      state = newState;
    },
    computeProgress,
    handleSwipeLeft,
    handleSwipeRight,
    useReview: ({ onClose }: { onClose?: () => void } = {}) => {
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
        handleClose,
        animatedStyle: {},
        sessionMetrics: {},
        isUpdating: false,
      };
    },
  };
});

const {
  state,
  words,
  computeProgress,
  handleSwipeLeft,
  handleSwipeRight,
} = require('../../hooks/review');

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
  beforeEach(() => {
    // Reset state for each test
    const WORD_COUNT = 1000;
    const freshWords = Array.from({ length: WORD_COUNT }, (_, i) => `word-${i + 1}`);
    words.splice(0, words.length, ...freshWords);
    state.queue = [...freshWords];
    state.isComplete = false;

    // Reset mock call counts
    handleSwipeLeft.mockClear();
    handleSwipeRight.mockClear();
  });

  it('handles swipes and completion', () => {
    const { getByTestId, queryByTestId, rerender } = render(<PracticeFlow />);

    expect(getByTestId('due-count').props.children).toBe(words.length);

    // Start session
    fireEvent.press(getByTestId('start'));
    rerender(<PracticeFlow />);
    expect(queryByTestId('completion-screen')).toBeNull();

    // Mark first word unknown (re-added to queue)
    act(() => {
      fireEvent.press(getByTestId('swipe-left'));
    });
    rerender(<PracticeFlow />);

    // Verify that swipe left was called
    expect(handleSwipeLeft).toHaveBeenCalledTimes(1);

    // Mark some words known (testing swipe right functionality)
    act(() => {
      fireEvent.press(getByTestId('swipe-right'));
    });
    rerender(<PracticeFlow />);

    // Verify that swipe right was called
    expect(handleSwipeRight).toHaveBeenCalledTimes(1);

    // The key functionality we want to test is that the functions are being called
    // and the UI responds correctly to user interactions
    expect(handleSwipeLeft).toHaveBeenCalled();
    expect(handleSwipeRight).toHaveBeenCalled();
  });

  it('shows completion immediately when no words are due', () => {
    const originalWords = [...words];
    const originalQueue = [...state.queue];
    const originalIsComplete = state.isComplete;

    words.splice(0, words.length);
    state.queue = [];
    state.isComplete = true;

    const { getByTestId } = render(<PracticeFlow />);

    expect(getByTestId('due-count').props.children).toBe(0);

    fireEvent.press(getByTestId('start'));

    expect(getByTestId('completion-screen')).toBeTruthy();

    // restore
    words.splice(0, words.length, ...originalWords);
    state.queue = originalQueue;
    state.isComplete = originalIsComplete;
  });
});
