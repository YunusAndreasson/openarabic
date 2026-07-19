/**
 * MiniPlayer Component Tests
 *
 * Tests mini audio player with progress, controls, and display.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render, fireEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { MiniPlayer } from '@/components/audio/MiniPlayer';

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

// Mock EnhancedImage
jest.mock('@/components/ui/EnhancedImage', () => ({
  EnhancedImage: ({ style }: { style: object }) => {
    const { View } = require('react-native');
    return <View testID="enhanced-image" style={style} />;
  },
}));

// Mock ProgressBar
jest.mock('@/components/common', () => ({
  ProgressBar: ({ progress }: { progress: number }) => {
    const { View } = require('react-native');
    return <View testID="progress-bar" accessibilityValue={{ now: progress }} />;
  },
}));

describe('MiniPlayer', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article Title',
    author: 'Test Author',
    category: 'Test Category',
    image_url: 'https://example.com/image.jpg',
  };

  const mockOnPlayPause = jest.fn();
  const mockOnTimerPress = jest.fn();

  const defaultProps = {
    article: mockArticle,
    isTimerActive: false,
    position: 30,
    duration: 180,
    onPlayPause: mockOnPlayPause,
    onTimerPress: mockOnTimerPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('uses a solid elevated surface at the app root', () => {
      const { getByTestId } = render(<MiniPlayer {...defaultProps} />);
      const surface = getByTestId('mini-player-surface');

      expect(surface).toHaveStyle({ backgroundColor: '#EEEEEE' });
      expect(surface.props.glassEffectStyle).toBeUndefined();
    });

    test('uses the same solid elevated surface inside a screen modal', () => {
      const { getByTestId } = render(<MiniPlayer {...defaultProps} placement="screen" />);
      const surface = getByTestId('mini-player-surface');

      expect(surface.props.glassEffectStyle).toBeUndefined();
      expect(surface).toHaveStyle({ backgroundColor: '#EEEEEE' });
    });

    test('renders article title', () => {
      const { getByText } = render(<MiniPlayer {...defaultProps} />);
      expect(getByText('Test Article Title')).toBeTruthy();
    });

    test('renders formatted author and category', () => {
      const { getByText } = render(<MiniPlayer {...defaultProps} />);
      // formatAuthorCategory combines author and category
      expect(getByText(/Test Author/)).toBeTruthy();
    });

    test('renders time display', () => {
      const { getByText } = render(<MiniPlayer {...defaultProps} />);
      // Position 30s, Duration 180s = "0:30 / 3:00"
      expect(getByText('0:30 / 3:00')).toBeTruthy();
    });

    test('renders artwork image', () => {
      const { getByTestId } = render(<MiniPlayer {...defaultProps} />);
      expect(getByTestId('enhanced-image')).toBeTruthy();
    });

    test('renders progress bar', () => {
      const { getByTestId } = render(<MiniPlayer {...defaultProps} />);
      expect(getByTestId('progress-bar')).toBeTruthy();
    });
  });

  describe('Queue Position', () => {
    test('does not render queue position when not provided', () => {
      const { queryByText } = render(<MiniPlayer {...defaultProps} />);
      expect(queryByText(/of/)).toBeNull();
    });

    test('renders queue position when total > 1', () => {
      const { getByText } = render(
        <MiniPlayer {...defaultProps} queuePosition={{ current: 2, total: 5 }} />,
      );
      expect(getByText('2/5')).toBeTruthy();
    });

    test('does not render queue position when total is 1', () => {
      const { queryByText } = render(
        <MiniPlayer {...defaultProps} queuePosition={{ current: 1, total: 1 }} />,
      );
      expect(queryByText('1/1')).toBeNull();
    });
  });

  describe('Timer State', () => {
    test('renders timer button', () => {
      const { toJSON } = render(<MiniPlayer {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    test('timer button reflects active state visually', () => {
      const { rerender, toJSON } = render(<MiniPlayer {...defaultProps} isTimerActive={false} />);
      const inactiveSnapshot = JSON.stringify(toJSON());

      rerender(<MiniPlayer {...defaultProps} isTimerActive={true} />);
      const activeSnapshot = JSON.stringify(toJSON());

      // Visual representation should differ based on timer state
      expect(inactiveSnapshot).not.toBe(activeSnapshot);
    });
  });

  describe('Time Formatting', () => {
    test('formats time correctly for short durations', () => {
      const { getByText } = render(<MiniPlayer {...defaultProps} position={5} duration={60} />);
      expect(getByText('0:05 / 1:00')).toBeTruthy();
    });

    test('formats time correctly for long durations', () => {
      const { getByText } = render(
        <MiniPlayer {...defaultProps} position={3661} duration={7200} />,
      );
      // 3661s = 61:01, 7200s = 120:00 (M:SS format, not H:MM:SS)
      expect(getByText('61:01 / 120:00')).toBeTruthy();
    });

    test('handles zero position', () => {
      const { getByText } = render(<MiniPlayer {...defaultProps} position={0} duration={180} />);
      expect(getByText('0:00 / 3:00')).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    test('renders consistently with same props', () => {
      const { toJSON, rerender } = render(<MiniPlayer {...defaultProps} />);
      const firstRender = JSON.stringify(toJSON());

      rerender(<MiniPlayer {...defaultProps} />);
      const secondRender = JSON.stringify(toJSON());

      expect(firstRender).toBe(secondRender);
    });

    test('updates when article changes', () => {
      const { rerender, getByText } = render(<MiniPlayer {...defaultProps} />);
      expect(getByText('Test Article Title')).toBeTruthy();

      rerender(
        <MiniPlayer {...defaultProps} article={{ ...mockArticle, id: 2, title: 'New Article' }} />,
      );
      expect(getByText('New Article')).toBeTruthy();
    });
  });
});
