/**
 * DictionaryWordRow Component Tests
 *
 * Tests the vocabulary word row: word rendering, tap-to-open, and swipe
 * actions (reset progress / remove).
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { DictionaryWordRow } from '@/components/practice/DictionaryWordRow';
import type { StudyWord } from '@/types/vocabulary.types';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId, userId } from '@/__tests__/helpers/ids';
import type { UserId } from '@/types/branded.types';

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
// swipe action buttons are reachable without gesture simulation.
//
// This factory has to stand in for the WHOLE gesture-handler module, not just
// the swipeable. jest.config's moduleNameMapper key is a regex, so
// 'react-native-gesture-handler' matches the '/ReanimatedSwipeable' subpath too
// and both imports resolve to the same module — mocking one replaces the other.
// Anything the component imports from the package root (Pressable) must be
// re-exported here or it arrives undefined, which surfaces as the thoroughly
// unhelpful "Element type is invalid".
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const MockReact = require('react');
  const { View, Pressable } = require('react-native');
  const MockSwipeable = MockReact.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        renderRightActions?: (
          progress: { value: number },
          drag: { value: number },
        ) => React.ReactNode;
      },
      _ref: unknown,
    ) =>
      MockReact.createElement(
        View,
        null,
        props.children,
        // The real signature passes shared values; the actions read `drag`.
        props.renderRightActions ? props.renderRightActions({ value: 0 }, { value: 0 }) : null,
      ),
  );
  return { __esModule: true, default: MockSwipeable, Pressable };
});

describe('DictionaryWordRow', () => {
  const mockOnPress = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnResetProgress = jest.fn();

  const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
    createTestWord({
      user_id: userId('user-123'),
      root_id: rootId(42),
      fsrs_state: 2,
      fsrs_stability: 5.0,
      fsrs_difficulty: 0.3,
      fsrs_due: '2024-01-01T00:00:00Z',
      fsrs_last_review: '2024-01-01T00:00:00Z',
      fsrs_reps: 5,
      fsrs_lapses: 1,
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
    });

  const renderRow = (word: StudyWord) =>
    render(
      <DictionaryWordRow
        word={word}
        sortField="difficulty"
        nowMs={Date.parse('2024-01-02T00:00:00Z')}
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
      const { getByText } = renderRow(createMockWord());
      expect(getByText('كتب')).toBeTruthy();
    });

    test('renders English meaning from root with capitalized first letter', () => {
      const { getByText } = renderRow(createMockWord());
      expect(getByText('To write')).toBeTruthy();
    });

    test('renders without crashing when root is missing', () => {
      const { queryByText } = renderRow(createMockWord({ root: undefined }));
      expect(queryByText('كتب')).toBeNull();
      expect(queryByText('To write')).toBeNull();
    });
  });

  describe('Row Press', () => {
    test('calls onPress with word when the row is pressed', () => {
      const word = createMockWord();
      const { getByText } = renderRow(word);

      fireEvent.press(getByText('كتب'));

      expect(mockOnPress).toHaveBeenCalledWith(word);
    });
  });

  describe('Swipe Actions', () => {
    test('calls onResetProgress with word when reset action is pressed', () => {
      const word = createMockWord();
      const { getByLabelText } = renderRow(word);

      // Targeted by accessibility label, not the icon glyph: the actions are
      // plain icons in flush panels now, and the label is what a learner using
      // a screen reader actually gets.
      fireEvent.press(getByLabelText('Reset progress'));

      expect(mockOnResetProgress).toHaveBeenCalledWith(word);
      expect(mockOnRemove).not.toHaveBeenCalled();
    });

    test('calls onRemove with word when remove action is pressed', () => {
      const word = createMockWord();
      const { getByLabelText } = renderRow(word);

      fireEvent.press(getByLabelText('Remove from practice'));

      expect(mockOnRemove).toHaveBeenCalledWith(word);
      expect(mockOnResetProgress).not.toHaveBeenCalled();
    });
  });

  describe('Memoization', () => {
    test('renders consistently with same props', () => {
      const word = createMockWord();
      const { toJSON, rerender } = renderRow(word);
      const firstRender = JSON.stringify(toJSON());

      rerender(
        <DictionaryWordRow
          word={word}
          sortField="difficulty"
          nowMs={Date.parse('2024-01-02T00:00:00Z')}
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

      const { rerender, getByText, queryByText } = renderRow(word1);
      expect(getByText('كتب')).toBeTruthy();

      rerender(
        <DictionaryWordRow
          word={word2}
          sortField="difficulty"
          nowMs={Date.parse('2024-01-02T00:00:00Z')}
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
