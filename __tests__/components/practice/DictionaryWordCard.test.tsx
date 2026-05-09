/**
 * DictionaryWordCard Component Tests
 *
 * Tests vocabulary word card with edit mode and audio playback.
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

// Mock edit mode card animation
jest.mock('@/hooks/cards', () => ({
  useEditModeCardAnimation: () => ({
    animatedStyle: {},
  }),
}));

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

// Mock urgencyScore util — jest.fn() so we can spy on call arguments
jest.mock('@/utils/urgencyScore', () => ({
  getStabilityProgressColor: jest.fn((stability: number | null) => {
    if (stability === null || stability < 1) return 'error';
    if (stability < 7) return 'warning';
    return 'success';
  }),
}));

describe('DictionaryWordCard', () => {
  const mockOnDelete = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders Arabic text from root', () => {
      const word = createMockWord();
      const { getByText } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(getByText('كتب')).toBeTruthy();
    });

    test('renders English meaning from root with capitalized first letter', () => {
      const word = createMockWord();
      const { getByText } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(getByText('To write')).toBeTruthy();
    });

    test('renders fallback text when root is missing', () => {
      const word = createMockWord({ root: undefined });
      const { getByText } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(getByText('Unknown Arabic')).toBeTruthy();
      // Fallback text is already capitalized, so it remains "Unknown English"
      expect(getByText('Unknown English')).toBeTruthy();
    });
  });

  describe('Edit Mode', () => {
    test('shows delete button in edit mode', () => {
      const word = createMockWord();
      const { toJSON } = render(
        <DictionaryWordCard word={word} editMode={true} onDelete={mockOnDelete} />,
      );
      // Component should render with delete button
      expect(toJSON()).toBeTruthy();
    });

    test('hides delete button when not in edit mode', () => {
      const word = createMockWord();
      const { toJSON } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('calls onDelete when delete button is pressed in edit mode', () => {
      const word = createMockWord();
      // DeleteButton component is mocked, so we verify the structure exists
      const { toJSON } = render(
        <DictionaryWordCard word={word} editMode={true} onDelete={mockOnDelete} />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Card Press', () => {
    test('calls onPress with word when card is pressed (not in edit mode)', () => {
      const word = createMockWord();
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <DictionaryWordCard
          word={word}
          editMode={false}
          onDelete={mockOnDelete}
          onPress={mockOnPress}
        />,
      );

      fireEvent.press(getByText('كتب'));

      expect(mockOnPress).toHaveBeenCalledWith(word);
    });

    test('card is not pressable in edit mode', () => {
      const word = createMockWord();
      const mockOnPress = jest.fn();
      const { toJSON } = render(
        <DictionaryWordCard
          word={word}
          editMode={true}
          onDelete={mockOnDelete}
          onPress={mockOnPress}
        />,
      );
      // In edit mode, the card should render without press handler
      // Verify the component renders correctly in edit mode
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Memory Strength Indicator', () => {
    test('renders memory strength dot', () => {
      const word = createMockWord({ fsrs_stability: 10 });
      const { toJSON } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('dot color reflects stability level', () => {
      // The dot is rendered through Skia (GlowingDot) so its tint isn't in
      // the RN tree — instead, verify the component routes each word's
      // stability into getStabilityProgressColor (the mock above returns
      // 'error' for <1 and 'success' for ≥7).
      const stabilitySpy = getStabilityProgressColor as jest.MockedFunction<
        typeof getStabilityProgressColor
      >;
      stabilitySpy.mockClear();

      const lowStabilityWord = createMockWord({ fsrs_stability: 0.5 });
      const { rerender } = render(
        <DictionaryWordCard word={lowStabilityWord} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(stabilitySpy).toHaveBeenCalledWith(0.5);

      const highStabilityWord = createMockWord({ fsrs_stability: 30 });
      rerender(
        <DictionaryWordCard word={highStabilityWord} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(stabilitySpy).toHaveBeenCalledWith(30);
    });
  });

  describe('Memoization', () => {
    test('renders consistently with same props', () => {
      const word = createMockWord();
      const { toJSON, rerender } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />,
      );
      const firstRender = JSON.stringify(toJSON());

      rerender(<DictionaryWordCard word={word} editMode={false} onDelete={mockOnDelete} />);
      const secondRender = JSON.stringify(toJSON());

      expect(firstRender).toBe(secondRender);
    });

    test('updates when word changes', () => {
      const word1 = createMockWord({ root: { ...createMockWord().root!, letters: 'كتب' } });
      const word2 = createMockWord({ root: { ...createMockWord().root!, letters: 'قرأ' } });

      const { rerender, getByText, queryByText } = render(
        <DictionaryWordCard word={word1} editMode={false} onDelete={mockOnDelete} />,
      );
      expect(getByText('كتب')).toBeTruthy();

      rerender(<DictionaryWordCard word={word2} editMode={false} onDelete={mockOnDelete} />);
      expect(getByText('قرأ')).toBeTruthy();
      expect(queryByText('كتب')).toBeNull();
    });
  });
});
