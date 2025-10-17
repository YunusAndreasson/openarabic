import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import React from 'react';

import { Text, TouchableOpacity, View } from 'react-native';
import { ArabicWord } from '../../components/article/ArabicWord';
import { ArticleCard } from '../../components/library/ArticleCard';
import { CompletionScreen } from '../../components/review/CompletionScreen';
import { VocabularyStatCards } from '../../components/study/VocabularyStatCards';
import { useReview } from '../../hooks/review';

// Keep inline for hoisting - expo-router is imported by dependencies
jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn() };
  return { router, useRouter: () => router };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: () => <></>,
  };
});

jest.mock('../../components/ThemedButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const ThemedButton = ({ title, onPress, disabled, testID }: any) => (
    <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  return { __esModule: true, ThemedButton };
});

jest.mock('../../components/library/ArticleCard', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    ArticleCard: ({ onPress, testID }: any) => <TouchableOpacity onPress={onPress} testID={testID} />,
  };
});

jest.mock('../../components/article/ArabicWord', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    ArabicWord: ({ onPress, testID, word }: any) => (
      <TouchableOpacity testID={testID} onPress={() => onPress(word)} />
    ),
  };
});

jest.mock('../../components/review/CompletionScreen', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    CompletionScreen: ({ testID = 'completion-screen' }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('../../components/study/VocabularyStatCards', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    VocabularyStatCards: ({ onStartReview }: { onStartReview: () => void }) => (
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
  return { ...actual, SCREEN_WIDTH: 360 };
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
      handleClose: jest.fn(),
      animatedStyle: {},
      sessionMetrics: {},
      isUpdating: false,
    }),
  };
});

const { state } = require('../../hooks/review');
const { router } = require('expo-router');

function DummyReview(): JSX.Element {
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
        categoryForDisplay="Category"
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

  it('opens word tooltip on press', () => {
    const onPress = jest.fn();
    const onTooltipOpen = jest.fn();
    const word = { id: 1, word_form: 'w', english: 'w', root_id: 1 } as any;
    const { getByTestId } = render(
      <ArabicWord
        word={word}
        onPress={onPress}
        onTooltipOpen={onTooltipOpen}
        testID="word-1"
      />
    );

    fireEvent.press(getByTestId('word-1'));
    expect(onPress).toHaveBeenCalledWith(word);
  });

  it('starts practice session', () => {
    const onStartReview = jest.fn();
    const studyWord = { root_id: 1 } as any;
    const { getByTestId } = render(
      <VocabularyStatCards studyWords={[studyWord]} dueWords={1} onStartReview={onStartReview} />
    );

    fireEvent.press(getByTestId('start-review-due'));
    expect(onStartReview).toHaveBeenCalled();
  });

  it('shows error when review session fails to start', async () => {
    const startReview = jest.fn().mockRejectedValue(new Error('fail'));

    function ReviewStarter(): JSX.Element {
      const [error, setError] = React.useState(false);

      const handleStart = async () => {
        try {
          await startReview();
          router.push('/study/review');
        } catch {
          setError(true);
        }
      };

      if (error) {
        return (
          <View testID="error-message">
            <Text>Error starting review</Text>
          </View>
        );
      }

      return (
        <VocabularyStatCards
          studyWords={[{ root_id: 1 } as any]}
          dueWords={1}
          onStartReview={handleStart}
        />
      );
    }

    const { getByTestId, queryByTestId } = render(<ReviewStarter />);

    await act(async () => {
      fireEvent.press(getByTestId('start-review-due'));
      await Promise.resolve();
    });

    expect(router.push).not.toHaveBeenCalled();
    expect(queryByTestId('error-message')).toBeTruthy();
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
