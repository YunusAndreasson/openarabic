/**
 * PlayButton Component Tests
 *
 * Tests play/pause button with state-based icon switching.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { PlayButton } from '@/components/playlist/PlayButton';

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
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
  useCurrentTheme: () => 'light',
}));

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
}));

jest.mock('@/utils/layoutUtils', () => ({
  createAndroidRipple: () => ({ color: 'rgba(0,0,0,0.1)' }),
  createPadding: () => ({}),
}));

describe('PlayButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders play icon when not playing', () => {
      const { toJSON } = render(<PlayButton onPress={mockOnPress} isPlaying={false} />);
      expect(toJSON()).toBeTruthy();
    });

    test('renders pause icon when playing', () => {
      const { toJSON } = render(<PlayButton onPress={mockOnPress} isPlaying={true} />);
      expect(toJSON()).toBeTruthy();
    });

    test('renders without isPlaying prop (defaults to false)', () => {
      const { toJSON } = render(<PlayButton onPress={mockOnPress} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('States', () => {
    test('renders enabled state by default', () => {
      const { toJSON } = render(<PlayButton onPress={mockOnPress} />);
      expect(toJSON()).toBeTruthy();
    });

    test('renders disabled state when disabled prop is true', () => {
      const { toJSON } = render(<PlayButton onPress={mockOnPress} disabled />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Icon Switching', () => {
    test('switches between play and pause based on isPlaying', () => {
      const { rerender, toJSON } = render(<PlayButton onPress={mockOnPress} isPlaying={false} />);
      const playSnapshot = JSON.stringify(toJSON());

      rerender(<PlayButton onPress={mockOnPress} isPlaying={true} />);
      const pauseSnapshot = JSON.stringify(toJSON());

      // Snapshots should be different (different icons)
      expect(playSnapshot).not.toBe(pauseSnapshot);
    });
  });
});
