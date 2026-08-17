/**
 * WordDisplay Component Tests
 *
 * Tests word display for review flashcards.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';

import { WordDisplay } from '@/components/review/WordDisplay';

// Mock reanimated
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

// Mock theme hook
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory({
    arabicText: '#1a1a1a',
    shadow: '#000000',
    englishText: '#333333',
  }),
);

// Mock animations hook
jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

// Mock ThemedText
jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  const React = require('react');
  return {
    ThemedText: ({ children, type }: { children: React.ReactNode; type?: string }) =>
      React.createElement(Text, { testID: `text-${type || 'default'}` }, children),
  };
});

// Mock haptics
const mockLightFeedback = jest.fn();
const mockSelectionFeedback = jest.fn();
jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

// Mock ToastType enum
jest.mock('@/types/enums', () => ({
  ToastType: {
    INFO: 'info',
  },
}));

describe('WordDisplay', () => {
  const mockOnWordPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders Arabic word', () => {
      const { getByText } = render(<WordDisplay word="كتب" />);

      expect(getByText('كتب')).toBeTruthy();
    });

    // WordDisplay no longer owns the meaning. It renders the shared top of both
    // card faces (word class + the Arabic hero) and hosts whatever that face
    // puts below it; the meaning is the answer face's content, so ReviewFlipCard
    // owns it. That split is what keeps the Arabic at an identical y on both
    // faces through the flip.
    test('renders face-specific children below the word', () => {
      const { getByText } = render(
        <WordDisplay word="كتب">
          <Text>To write</Text>
        </WordDisplay>,
      );

      expect(getByText('كتب')).toBeTruthy();
      expect(getByText('To write')).toBeTruthy();
    });

    test('renders only the word when no children are given', () => {
      const { queryByText, getByText } = render(<WordDisplay word="كتب" />);

      expect(getByText('كتب')).toBeTruthy();
      expect(queryByText('To write')).toBeNull();
    });

    test('renders the word class when the corpus knows one', () => {
      const { getByText, queryByText } = render(<WordDisplay word="كتب" wordType="Verb" />);

      expect(getByText('Verb')).toBeTruthy();
      // Optional by design: not every root has an example sentence to join.
      expect(queryByText('Noun')).toBeNull();
    });
  });

  // Note: Hesitation hint tests removed - hint functionality was replaced by
  // automatic hesitation detection (2-second threshold determines vague vs known)

  describe('Word Press Interaction', () => {
    test('calls onWordPress when word is pressed', () => {
      const { getByText } = render(<WordDisplay word="كتب" onWordPress={mockOnWordPress} />);

      fireEvent.press(getByText('كتب'));

      expect(mockOnWordPress).toHaveBeenCalledTimes(1);
    });

    test('does not trigger haptic feedback when word is pressed', () => {
      const { getByText } = render(<WordDisplay word="كتب" onWordPress={mockOnWordPress} />);

      fireEvent.press(getByText('كتب'));

      // Haptics removed for review interactions (2025 UX best practice)
      expect(mockLightFeedback).not.toHaveBeenCalled();
    });

    test('does not call onWordPress when not provided', () => {
      const { getByText } = render(<WordDisplay word="كتب" />);

      // Should not throw
      fireEvent.press(getByText('كتب'));
      expect(mockOnWordPress).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    test('accepts custom style prop', () => {
      const { toJSON } = render(<WordDisplay word="كتب" style={{ marginTop: 20 }} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty word', () => {
      const { toJSON } = render(<WordDisplay word="" />);

      expect(toJSON()).toBeTruthy();
    });

    test('handles long Arabic word', () => {
      const longWord = 'استغفرالله';
      const { getByText } = render(<WordDisplay word={longWord} />);

      expect(getByText(longWord)).toBeTruthy();
    });

    test('handles long child content', () => {
      const { getByText } = render(
        <WordDisplay word="كتب">
          <Text>To write, to compose, to author a book</Text>
        </WordDisplay>,
      );

      expect(getByText('To write, to compose, to author a book')).toBeTruthy();
    });
  });
});
