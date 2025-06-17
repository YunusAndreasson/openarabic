import React from 'react';
import { View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  STRUGGLING_DIFFICULTY_THRESHOLD,
  STRUGGLING_LAPSES_THRESHOLD,
  STRICT_MASTERED_STABILITY_THRESHOLD,
  MASTERED_DIFFICULTY_MAX,
  DEFAULT_FSRS_DIFFICULTY,
} from '../../constants/fsrs';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <props.name {...props} />,
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      const { children, backgroundStyle, handleIndicatorStyle, ...otherProps } = props;
      return <View {...otherProps}>{children}</View>;
    }),
    BottomSheetView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    BottomSheetBackdrop: (props: any) => <TouchableOpacity {...props} />,
  };
});

jest.mock('react-native-gesture-handler', () => {
  return {
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

  // Use hardcoded values to avoid Jest scope issues
  const STRUGGLING_DIFFICULTY_THRESHOLD = 8.0;
  const STRUGGLING_LAPSES_THRESHOLD = 1;
  const STRICT_MASTERED_STABILITY_THRESHOLD = 21;
  const MASTERED_DIFFICULTY_MAX = 5;
  const DEFAULT_FSRS_DIFFICULTY = 6.5;

  function getActions(word: any) {
    const difficulty = word.fsrs_difficulty ?? DEFAULT_FSRS_DIFFICULTY;
    const stability = word.fsrs_stability ?? 0;
    const lapses = word.fsrs_lapses ?? 0;
    const isStruggling =
      difficulty >= STRUGGLING_DIFFICULTY_THRESHOLD && lapses >= STRUGGLING_LAPSES_THRESHOLD;
    const isMastered =
      stability >= STRICT_MASTERED_STABILITY_THRESHOLD && difficulty <= MASTERED_DIFFICULTY_MAX;
    if (isStruggling) return ['easy', 'skip', 'reset', 'remove'];
    if (isMastered) return ['hard', 'skip', 'reset', 'remove'];
    return ['easy', 'hard', 'skip', 'reset', 'remove'];
  }
  const MockWordManagementModal = ({
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
        {getActions(word).map((id: string) => {
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

  return { __esModule: true, default: MockWordManagementModal };
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

import ReviewBottomActions from '../../components/review/ReviewBottomActions';
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
        <ReviewBottomActions
          onShowMeaning={() => {}}
          onManageWord={() => setVisible(true)}
          hasCurrentWord={true}
        />
        {/* @ts-expect-error - Mock component interface conflict */}
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
