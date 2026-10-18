/**
 * ReviewHeader Component Tests
 *
 * Tests review session progress header with close button.
 *
 * A 'Voice control' suite used to sit at the bottom of this file, covering the
 * header's mic slot in its four states (dormant offer, preparing, live toggle,
 * muted). The whole slot was removed — "Speak to answer" in the bottom band is
 * the only thing that opens the microphone now — and the suite went with it.
 *
 * Nothing replaced it on purpose. With no mic code path and no voice props
 * left, every assertion about a mic being absent holds for every possible
 * input, so it would read as coverage while being incapable of failing. The
 * close button, which is now the header's only control, is already covered by
 * the Rendering suite below in both directions.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ReviewHeader } from '@/components/review/ReviewHeader';

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

// Mock ProgressBar component
jest.mock('@/components/common', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    ProgressBar: ({ progress, height }: { progress: number; height: number }) =>
      React.createElement(View, {
        testID: 'progress-bar',
        accessibilityValue: { now: progress },
        style: { height },
      }),
  };
});

// Mock haptics. Reach for the mocks through require('@/utils/haptics') — a
// module-scope `const mockX = jest.fn()` referenced from assertions is NOT what
// the factory below installs, so any expectation on it passes vacuously
// whatever the component does.
jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  warningFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

// Mock expo vector icons
jest.mock('@/components/ui/Icon', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement(View, { testID: `icon-${name}` }),
  };
});

describe('ReviewHeader', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with progress bar', () => {
      const { getByTestId } = render(<ReviewHeader progress={5} maxProgress={10} />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    test('renders close button when onClose is provided', () => {
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      expect(getByTestId('icon-close-outline')).toBeTruthy();
    });

    test('does not render close button when onClose is not provided', () => {
      const { queryByTestId } = render(<ReviewHeader progress={5} maxProgress={10} />);

      expect(queryByTestId('icon-close-outline')).toBeNull();
    });
  });

  describe('Progress Display', () => {
    test.each([
      ['keeps the high-water mark when current progress falls', 8, 10, 10],
      ['shows current progress when it exceeds the high-water mark', 15, 10, 15],
      ['keeps a zero baseline at zero', 0, 0, 0],
    ])('%s', (_label, progress, maxProgress, expected) => {
      const { getByTestId } = render(
        <ReviewHeader progress={progress} maxProgress={maxProgress} />,
      );

      expect(getByTestId('progress-bar')).toHaveProp('accessibilityValue', { now: expected });
    });
  });

  describe('Close Button Interaction', () => {
    test('calls onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      // Find the pressable that contains the close icon
      const closeIcon = getByTestId('icon-close-outline');
      const pressable = closeIcon.parent;

      expect(pressable).not.toBeNull();
      fireEvent.press(pressable!);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    // The close haptic lives on this button rather than in useReview's
    // handleClose, because that exit is also reached from the completion
    // screen's ThemedButtons — which fire their own. Keeping it in the hook
    // buzzed Continue twice in one tick, hidden only by the 50ms debounce.
    // This bare Pressable has no press feedback of its own, so it needs this.
    //
    // Selection, not Light: leaving the session is
    // navigation, and tier 0 in utils/haptics is everything that only moves the
    // UI. A chrome button that lands as hard as a grade leaves the grade
    // nothing to be louder than.
    test('the close button carries its own press feedback, at the faintest tier', () => {
      const { selectionFeedback, lightFeedback } = require('@/utils/haptics');
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      const pressable = getByTestId('icon-close-outline').parent;
      expect(pressable).toBeTruthy();
      fireEvent.press(pressable!);

      expect(selectionFeedback).toHaveBeenCalledTimes(1);
      expect(lightFeedback).not.toHaveBeenCalled();
    });
  });

  // The "N in a row" counter is gone: a scoreboard beside the progress bar, a
  // flattering count (re-asks and "Barely" included) and a second haptic for a
  // grade already felt. The header says how far through the session you are,
  // and nothing else.
  describe('No run counter', () => {
    test('the header carries progress and the way out, nothing else', () => {
      const { lightFeedback } = require('@/utils/haptics');
      const { queryByText } = render(<ReviewHeader progress={50} maxProgress={50} />);

      expect(queryByText(/in a row/)).toBeNull();
      expect(lightFeedback).not.toHaveBeenCalled();
    });
  });
});
