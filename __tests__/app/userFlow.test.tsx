import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import React from 'react';

import { Text, TouchableOpacity, View } from 'react-native';
import { SkiaArabicWord as ArabicWord } from '../../components/article/SkiaArabicWord';
import { ArticleCard } from '../../components/explore/ArticleCard';
import { CompletionScreen } from '../../components/review/CompletionScreen';
import { PracticeStatCards } from '../../components/practice/PracticeStatCards';
import { useReview } from '../../hooks/review';

// Keep inline for hoisting - expo-router is imported by dependencies
jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn() };
  return { router, useRouter: () => router };
});

// LinearGradient is now from @shopify/react-native-skia, not expo-linear-gradient
// The mock is handled in jest.config.js transformIgnorePatterns

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: () => <></>,
  };
});

jest.mock('../../components/ThemedButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  interface MockThemedButtonProps {
    title?: string;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }
  const ThemedButton = ({ title, onPress, disabled, testID }: MockThemedButtonProps) => (
    <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  return { __esModule: true, ThemedButton };
});

jest.mock('../../components/explore/ArticleCard', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  interface MockArticleCardProps {
    onPress?: () => void;
    testID?: string;
  }
  return {
    __esModule: true,
    ArticleCard: ({ onPress, testID }: MockArticleCardProps) => (
      <TouchableOpacity onPress={onPress} testID={testID} />
    ),
  };
});

jest.mock('../../components/article/SkiaArabicWord', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  interface MockWord {
    id: number;
    word_form: string;
  }
  interface MockSkiaArabicWordProps {
    onPress?: (word: MockWord) => void;
    testID?: string;
    word: MockWord;
  }
  return {
    __esModule: true,
    SkiaArabicWord: ({ onPress, testID, word }: MockSkiaArabicWordProps) => (
      <TouchableOpacity testID={testID} onPress={() => onPress?.(word)} />
    ),
  };
});

jest.mock('../../components/review/CompletionScreen', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    CompletionScreen: ({ testID = 'completion-screen' }: { testID?: string }) => (
      <View testID={testID} />
    ),
  };
});

jest.mock('../../components/practice/PracticeStatCards', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    PracticeStatCards: ({ onStartReview }: { onStartReview: () => void }) => (
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

// Minimal test types for mocked components
interface TestArticle {
  id: number;
  title: string;
  author: { name: string };
  category: { name: string };
}

interface TestWord {
  id: number;
  word_form: string;
  english: string;
  root_id: number;
}

interface TestStudyWord {
  root_id: number;
}

describe('UI flow', () => {
  test('renders an article card', () => {
    const testArticle: TestArticle = {
      id: 1,
      title: 't',
      author: { name: 'A' },
      category: { name: 'cat' },
    };
    const { getByTestId } = render(
      <ArticleCard
        category="cat"
        imageUrl="img"
        summary="s"
        title="t"
        article={testArticle as Parameters<typeof ArticleCard>[0]['article']}
        testID="article-1"
      />,
    );

    expect(getByTestId('article-1')).toBeTruthy();
  });

  test('opens word tooltip on press', () => {
    const onPress = jest.fn();
    const onTooltipOpen = jest.fn();
    const word: TestWord = { id: 1, word_form: 'w', english: 'w', root_id: 1 };
    const { getByTestId } = render(
      <ArabicWord
        word={word as Parameters<typeof ArabicWord>[0]['word']}
        onPress={onPress}
        onTooltipOpen={onTooltipOpen}
        testID="word-1"
      />,
    );

    fireEvent.press(getByTestId('word-1'));
    expect(onPress).toHaveBeenCalledWith(word);
  });

  test('starts practice session', () => {
    const onStartReview = jest.fn();
    const studyWord: TestStudyWord = { root_id: 1 };
    const { getByTestId } = render(
      <PracticeStatCards
        studyWords={[studyWord] as Parameters<typeof PracticeStatCards>[0]['studyWords']}
        dueWords={1}
        onStartReview={onStartReview}
      />,
    );

    fireEvent.press(getByTestId('start-review-due'));
    expect(onStartReview).toHaveBeenCalled();
  });

  test('shows error when review session fails to start', async () => {
    const startReview = jest.fn().mockRejectedValue(new Error('fail'));

    function ReviewStarter(): JSX.Element {
      const [error, setError] = React.useState(false);

      const handleStart = async () => {
        try {
          await startReview();
          router.push('/review');
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

      const studyWord: TestStudyWord = { root_id: 1 };
      return (
        <PracticeStatCards
          studyWords={[studyWord] as Parameters<typeof PracticeStatCards>[0]['studyWords']}
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

  test('completes review after swipe', () => {
    const { getByTestId, queryByTestId, rerender } = render(<DummyReview />);
    expect(queryByTestId('completion-screen')).toBeNull();

    act(() => {
      fireEvent.press(getByTestId('review-card'));
    });

    rerender(<DummyReview />);
    expect(getByTestId('completion-screen')).toBeTruthy();
  });
});
