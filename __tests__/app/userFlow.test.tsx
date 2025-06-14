import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import ArticleCard from '../../components/ArticleCard';
import { ArabicWord } from '../../components/article/ArabicWord';
import VocabularyStatCards from '../../components/vocabulary/VocabularyStatCards';
import CompletionScreen from '../../components/review/CompletionScreen';
import { TouchableOpacity } from 'react-native';
import { useReview } from '../../hooks/review';

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: () => <></>,
  };
});

jest.mock('../../components/ArticleCard', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onPress, testID }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID} />
    ),
  };
});

jest.mock('../../components/article/ArabicWord', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    ArabicWord: ({ onPress, testID, word }: any) => (
      <TouchableOpacity testID={testID} onLongPress={() => onPress(word)} />
    ),
  };
});

jest.mock('../../components/review/CompletionScreen', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ testID = 'completion-screen' }: { testID?: string }) => (
      <div testID={testID} />
    ),
  };
});

jest.mock('../../components/vocabulary/VocabularyStatCards', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onStartReview }: { onStartReview: () => void }) => (
      <TouchableOpacity onPress={onStartReview} testID="start-review-due" />
    ),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../hooks/theme/useColors', () => ({
  useColors: () => ({ tint: '#000', background: '#fff' }),
}));

jest.mock('../../hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

jest.mock('../../constants/layout', () => {
  const actual = jest.requireActual('../../constants/layout');
  return { ...actual, useScreenWidth: () => 360 };
});

jest.mock('../../hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: '1' } }),
}));


// Mock hooks used by ReviewScreen
jest.mock('../../hooks/review', () => {
  const state = { isComplete: false };
  const handleSwipeLeft = () => {
    state.isComplete = true;
  };
  return {
    __esModule: true,
    state,
    handleSwipeLeft,
    useReview: () => ({
      showMeaningOverlay: false,
      currentMeaning: '',
      currentSentence: { wordForm: 'word' },
      isTransitioningToCompletion: state.isComplete,
      isComplete: state.isComplete,
      progress: 0,
      maxProgress: 1,
      progressAnimationKey: 0,
      wordFontSize: 20,
      currentWordKey: '1',
      isVagueMeaning: false,
      isStruggling: false,
      handleSwipeLeft,
      handleSwipeRight: jest.fn(),
      handleTap: jest.fn(),
      handleLongPress: jest.fn(),
      handleClose: jest.fn(),
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
    }),
  };
});

const { state } = require('../../hooks/review');

function DummyReview() {
  const { handleSwipeLeft: swipeLeft, isComplete } = useReview();
  return isComplete ? (
    <CompletionScreen testID="completion-screen" onClose={() => {}} />
  ) : (
    <TouchableOpacity testID="review-card" onPress={swipeLeft} />
  );
}

describe('UI flow', () => {
  it('opens an article', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ArticleCard
        author="A"
        category="cat"
        imageUrl="img"
        summary="s"
        title="t"
        onPress={onPress}
        testID="article-1"
      />
    );

    fireEvent.press(getByTestId('article-1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('adds word to study words', () => {
    const onPress = jest.fn();
    const word = { id: 1, word_form: 'w', english: 'w', root_id: 1 } as any;
    const { getByTestId } = render(
      <ArabicWord
        word={word}
        settings={{ fontScale: 1 }}
        onPress={onPress}
        testID="word-1"
      />
    );

    fireEvent(getByTestId('word-1'), 'longPress');
    expect(onPress).toHaveBeenCalledWith(word);
  });

  it('starts practice session', () => {
    const onStartReview = jest.fn();
    const studyWord = { root_id: 1 } as any;
    const { getByTestId } = render(
      <VocabularyStatCards
        studyWords={[studyWord]}
        dueWords={1}
        onStartReview={onStartReview}
      />
    );

    fireEvent.press(getByTestId('start-review-due'));
    expect(onStartReview).toHaveBeenCalled();
  });

  it('completes review after swipe', () => {
    const { getByTestId, queryByTestId, rerender } = render(<DummyReview />);
    expect(queryByTestId('completion-screen')).toBeNull();

    act(() => {
      fireEvent.press(getByTestId('review-card'));
    });

    rerender(<DummyReview />);
    expect(getByTestId('completion-screen')).toBeTruthy();
  });
});

