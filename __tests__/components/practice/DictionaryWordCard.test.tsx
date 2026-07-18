/**
 * DictionaryWordCard Component Tests
 *
 * Tests the vocabulary word row: word rendering, tap-to-open, swipe actions
 * (reset progress / remove), and stability color routing.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { DictionaryWordCard } from '@/components/practice/DictionaryWordCard';
import type { StudyWord } from '@/types/vocabulary.types';
import { getStabilityProgressColor } from '@/utils/urgencyScore';

// Mock expo-router to avoid dependency chain issues
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory({
    error: '#F44336',
    warning: '#FF9800',
    success: '#4CAF50',
  }),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

jest.mock('@/utils/layoutUtils', () => ({
  createAndroidRipple: () => ({ color: 'rgba(0,0,0,0.1)' }),
  createPadding: () => ({}),
}));

// Render the swipeable inline: children plus the right-actions panel, so the
// swipe action buttons are reachable without gesture simulation
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const MockReact = require('react');
  const { View } = require('react-native');
  const MockSwipeable = MockReact.forwardRef(
    (
      props: { children?: React.ReactNode; renderRightActions?: () => React.ReactNode },
      _ref: unknown,
    ) =>
      MockReact.createElement(
        View,
        null,
        props.children,
        props.renderRightActions ? props.renderRightActions() : null,
      ),
  );
  return { __esModule: true, default: MockSwipeable };
});

// Swipe action buttons as pressable text so tests can target them by icon name
jest.mock('@/components/ui', () => {
  const MockReact = require('react');
  const { Text } = require('react-native');
  return {
    IconButton: ({ icon, onPress }: { icon: string; onPress: () => void }) =>
      MockReact.createElement(Text, { onPress }, `icon-${icon}`),
  };
});

// Mock urgencyScore util — jest.fn() so we can spy on call arguments
jest.mock('@/utils/urgencyScore', () => ({
  getStabilityProgressColor: jest.fn((stability: number | null) => {
    if (stability === null || stability < 1) return 'error';
    if (stability < 7) return 'warning';
    return 'success';
  }),
}));

describe('DictionaryWordCard', () => {
  const mockOnPress = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnResetProgress = jest.fn();

  const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
    ({
      id: 1,
      user_id: 'user-123',
      root_id: 42,
      fsrs_state: 2,
      fsrs_stability: 5.0,
      fsrs_difficulty: 0.3,
      fsrs_due: '2024-01-01T00:00:00Z',
      fsrs_last_review: '2024-01-01T00:00:00Z',
      fsrs_reps: 5,
      fsrs_lapses: 1,
      fsrs_elapsed_days: 1,
      fsrs_scheduled_days: 3,
      created_at: '2024-01-01T00:00:00Z',
      root: {
        id: 42,
        letters: 'كتب',
        meaning: 'to write',
        audio_url: 'https://example.com/audio.mp3',
        audio_url_en: 'https://example.com/audio_en.mp3',
      },
      ...overrides,
    }) as StudyWord;

  const renderCard = (word: StudyWord) =>
    render(
      <DictionaryWordCard
        word={word}
        onPress={mockOnPress}
        onRemove={mockOnRemove}
        onResetProgress={mockOnResetProgress}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders Arabic text from root', () => {
      const { getByText } = renderCard(createMockWord());
      expect(getByText('كتب')).toBeTruthy();
    });

    test('renders English meaning from root with capitalized first letter', () => {
      const { getByText } = renderCard(createMockWord());
      expect(getByText('To write')).toBeTruthy();
    });

    test('renders without crashing when root is missing', () => {
      const { toJSON } = renderCard(createMockWord({ root: undefined }));
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Card Press', () => {
    test('calls onPress with word when card is pressed', () => {
      const word = createMockWord();
      const { getByText } = renderCard(word);

      fireEvent.press(getByText('كتب'));

      expect(mockOnPress).toHaveBeenCalledWith(word);
    });
  });

  describe('Swipe Actions', () => {
    test('calls onResetProgress with word when reset action is pressed', () => {
      const word = createMockWord();
      const { getByText } = renderCard(word);

      fireEvent.press(getByText('icon-refresh'));

      expect(mockOnResetProgress).toHaveBeenCalledWith(word);
      expect(mockOnRemove).not.toHaveBeenCalled();
    });

    test('calls onRemove with word when remove action is pressed', () => {
      const word = createMockWord();
      const { getByText } = renderCard(word);

      fireEvent.press(getByText('icon-trash'));

      expect(mockOnRemove).toHaveBeenCalledWith(word);
      expect(mockOnResetProgress).not.toHaveBeenCalled();
    });
  });

  describe('Memory Strength Indicator', () => {
    test('routes stability into getStabilityProgressColor', () => {
      const stabilitySpy = getStabilityProgressColor as jest.MockedFunction<
        typeof getStabilityProgressColor
      >;
      stabilitySpy.mockClear();

      const lowStabilityWord = createMockWord({ fsrs_stability: 0.5 });
      const { rerender } = renderCard(lowStabilityWord);
      expect(stabilitySpy).toHaveBeenCalledWith(0.5);

      const highStabilityWord = createMockWord({ fsrs_stability: 30 });
      rerender(
        <DictionaryWordCard
          word={highStabilityWord}
          onPress={mockOnPress}
          onRemove={mockOnRemove}
          onResetProgress={mockOnResetProgress}
        />,
      );
      expect(stabilitySpy).toHaveBeenCalledWith(30);
    });
  });

  describe('Memoization', () => {
    test('renders consistently with same props', () => {
      const word = createMockWord();
      const { toJSON, rerender } = renderCard(word);
      const firstRender = JSON.stringify(toJSON());

      rerender(
        <DictionaryWordCard
          word={word}
          onPress={mockOnPress}
          onRemove={mockOnRemove}
          onResetProgress={mockOnResetProgress}
        />,
      );
      const secondRender = JSON.stringify(toJSON());

      expect(firstRender).toBe(secondRender);
    });

    test('updates when word changes', () => {
      const word1 = createMockWord({ root: { ...createMockWord().root!, letters: 'كتب' } });
      const word2 = createMockWord({ root: { ...createMockWord().root!, letters: 'قرأ' } });

      const { rerender, getByText, queryByText } = renderCard(word1);
      expect(getByText('كتب')).toBeTruthy();

      rerender(
        <DictionaryWordCard
          word={word2}
          onPress={mockOnPress}
          onRemove={mockOnRemove}
          onResetProgress={mockOnResetProgress}
        />,
      );
      expect(getByText('قرأ')).toBeTruthy();
      expect(queryByText('كتب')).toBeNull();
    });
  });
});
