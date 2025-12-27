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
  lightFeedback: () => mockLightFeedback(),
  selectionFeedback: () => mockSelectionFeedback(),
}));

// Mock text style utils
jest.mock('@/utils/textStyleUtils', () => ({
  createTextStyle: () => ({ fontSize: 64, color: '#1a1a1a' }),
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

    test('renders with translation when provided', () => {
      const { getByText } = render(<WordDisplay word="كتب" translation="to write" />);

      expect(getByText('كتب')).toBeTruthy();
      expect(getByText('To write')).toBeTruthy(); // Capitalized
    });

    test('renders without translation when not provided', () => {
      const { queryByText, getByText } = render(<WordDisplay word="كتب" />);

      expect(getByText('كتب')).toBeTruthy();
      expect(queryByText('to write')).toBeNull();
    });
  });

  describe('Hesitation Hint', () => {
    test('shows first letter hint when showFirstLetterOnly is true', () => {
      const { getByText } = render(
        <WordDisplay word="كتب" showFirstLetterOnly englishTranslation="write" />,
      );

      expect(getByText('W...')).toBeTruthy();
    });

    test('does not trigger haptic feedback when hint appears', () => {
      render(<WordDisplay word="كتب" showFirstLetterOnly englishTranslation="write" />);

      // Haptics removed for minor UI interactions (2025 UX best practice)
      expect(mockSelectionFeedback).not.toHaveBeenCalled();
    });

    test('does not show hint when showFirstLetterOnly is false', () => {
      const { queryByText } = render(
        <WordDisplay word="كتب" showFirstLetterOnly={false} englishTranslation="write" />,
      );

      expect(queryByText('W...')).toBeNull();
    });

    test('does not show hint when no english translation', () => {
      const { queryByText } = render(<WordDisplay word="كتب" showFirstLetterOnly />);

      // Should not crash and no hint shown
      expect(queryByText(/\.\.\./)).toBeNull();
    });

    test('hint is displayed as non-interactive element', () => {
      const { getByText } = render(
        <WordDisplay word="كتب" showFirstLetterOnly englishTranslation="write" />,
      );

      // Hint is now a View (non-pressable) - no haptic feedback
      expect(getByText('W...')).toBeTruthy();
      expect(mockLightFeedback).not.toHaveBeenCalled();
    });
  });

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

    test('handles long translation', () => {
      const { getByText } = render(
        <WordDisplay word="كتب" translation="to write, to compose, to author a book" />,
      );

      expect(getByText('To write, to compose, to author a book')).toBeTruthy(); // Capitalized
    });
  });
});
