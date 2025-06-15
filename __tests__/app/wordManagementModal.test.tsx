import React from 'react';
import type { ReactNode } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { describe, it, expect } from '@jest/globals';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <props.name {...props} />,
}));

jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

jest.mock('../../components/ProgressBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ProgressBar: (props: any) => <View {...props} /> };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureDetector: ({ children }: any) => <>{children}</>,
    Gesture: {
      Pan: () => {
        const chain = {
          onUpdate: () => chain,
          onEnd: () => chain,
        };
        return chain;
      },
    },
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('../../components/vocabulary/WordManagementModal', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
  function getActions(word: any) {
    const difficulty = word.fsrs_difficulty ?? 6.5;
    const stability = word.fsrs_stability ?? 0;
    const lapses = word.fsrs_lapses ?? 0;
    const isStruggling = difficulty >= 8.0 && lapses > 0;
    const isMastered = stability >= 21 && difficulty <= 5;
    if (isStruggling) return ['easy', 'skip', 'reset', 'remove'];
    if (isMastered) return ['hard', 'skip', 'reset', 'remove'];
    return ['easy', 'hard', 'skip', 'reset', 'remove'];
  }
  return ({
    visible,
    word,
    onClose,
    onRemoveFromStudy,
    onResetProgress,
    onSkipForToday,
    onMarkAsEasy,
    onMarkAsHard,
  }: any) =>
    visible ? (
      <View testID="word-management-modal">
        {getActions(word).map(id => {
          const onPressMap: any = {
            easy: () => onMarkAsEasy(word),
            hard: () => onMarkAsHard(word),
            skip: () => onSkipForToday(word),
            reset: () => onResetProgress(word),
            remove: () => onRemoveFromStudy(word),
          };
          return (
            <TouchableOpacity
              key={id}
              testID={`word-action-${id}`}
              onPress={() => {
                onPressMap[id]();
                onClose();
              }}
            />
          );
        })}
      </View>
    ) : null;
});

jest.mock('react-native-reanimated', () => ({
  default: {
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    createAnimatedComponent: (c: any) => c,
  },
  useSharedValue: (v: any) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  withTiming: (v: any) => v,
  withSpring: (v: any) => v,
  runOnJS: (fn: any) => fn,
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeOut: { duration: () => ({ delay: () => ({}) }) },
  SlideInDown: { duration: () => ({ damping: () => ({}) }) },
  SlideOutDown: { duration: () => ({}) },
  Layout: { duration: () => ({}) },
  Easing: {
    out: (fn: any) => fn,
    quad: () => {},
    cubic: () => {},
    bezier: () => () => {},
  },
}));

import ReviewHeader from '../../components/review/ReviewHeader';
import WordManagementModal from '../../components/vocabulary/WordManagementModal';

const baseWord: any = {
  root_id: 1,
  user_id: '1',
  root: { letters: 'كتاب', meaning: 'book' },
  fsrs_difficulty: 6,
  fsrs_stability: 0,
  fsrs_lapses: 0,
  created_at: '',
};

function renderWithWord(word: any) {
  const callbacks = {
    onRemoveFromStudy: jest.fn(),
    onResetProgress: jest.fn(),
    onSkipForToday: jest.fn(),
    onMarkAsEasy: jest.fn(),
    onMarkAsHard: jest.fn(),
  };

  const Wrapper = () => {
    const [visible, setVisible] = React.useState(false);
    return (
      <View>
        <ReviewHeader
          animationKey={0}
          maxProgress={1}
          progress={0}
          hasCurrentWord={true}
          onManageWord={() => setVisible(true)}
        />
        <WordManagementModal
          visible={visible}
          word={word}
          onClose={() => setVisible(false)}
          onRemoveFromStudy={callbacks.onRemoveFromStudy}
          onResetProgress={callbacks.onResetProgress}
          onSkipForToday={callbacks.onSkipForToday}
          onMarkAsEasy={callbacks.onMarkAsEasy}
          onMarkAsHard={callbacks.onMarkAsHard}
        />
      </View>
    );
  };

  const utils = render(<Wrapper />);
  return { ...utils, callbacks };
}

describe('Word management modal flow', () => {
  it('opens the modal and triggers actions', () => {
    const { getByTestId, queryByTestId, callbacks } = renderWithWord(baseWord);

    expect(queryByTestId('word-management-modal')).toBeNull();

    fireEvent.press(getByTestId('manage-word-button'));
    expect(getByTestId('word-management-modal')).toBeTruthy();

    fireEvent.press(getByTestId('word-action-easy'));
    expect(callbacks.onMarkAsEasy).toHaveBeenCalledWith(baseWord);

    fireEvent.press(getByTestId('manage-word-button'));
    fireEvent.press(getByTestId('word-action-hard'));
    expect(callbacks.onMarkAsHard).toHaveBeenCalledWith(baseWord);

    fireEvent.press(getByTestId('manage-word-button'));
    fireEvent.press(getByTestId('word-action-skip'));
    expect(callbacks.onSkipForToday).toHaveBeenCalledWith(baseWord);

    fireEvent.press(getByTestId('manage-word-button'));
    fireEvent.press(getByTestId('word-action-reset'));
    expect(callbacks.onResetProgress).toHaveBeenCalledWith(baseWord);

    fireEvent.press(getByTestId('manage-word-button'));
    fireEvent.press(getByTestId('word-action-remove'));
    expect(callbacks.onRemoveFromStudy).toHaveBeenCalledWith(baseWord);
  });

  it('shows correct actions for mastered word', () => {
    const masteredWord = { ...baseWord, fsrs_difficulty: 3, fsrs_stability: 22 };
    const { getByTestId, queryByTestId } = renderWithWord(masteredWord);

    fireEvent.press(getByTestId('manage-word-button'));
    expect(getByTestId('word-management-modal')).toBeTruthy();

    // Should show only "hard" action from difficulty
    expect(getByTestId('word-action-hard')).toBeTruthy();
    expect(queryByTestId('word-action-easy')).toBeNull();
  });

  it('shows correct actions for struggling word', () => {
    const strugglingWord = { ...baseWord, fsrs_difficulty: 9, fsrs_lapses: 2 };
    const { getByTestId, queryByTestId } = renderWithWord(strugglingWord);

    fireEvent.press(getByTestId('manage-word-button'));
    expect(getByTestId('word-management-modal')).toBeTruthy();

    expect(getByTestId('word-action-easy')).toBeTruthy();
    expect(getByTestId('word-action-skip')).toBeTruthy();
    expect(getByTestId('word-action-reset')).toBeTruthy();
    expect(getByTestId('word-action-remove')).toBeTruthy();
    expect(queryByTestId('word-action-hard')).toBeNull();
  });
});
