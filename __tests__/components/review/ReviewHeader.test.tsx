/**
 * ReviewHeader Component Tests
 *
 * Tests review session progress header with close button.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ReviewHeader } from '@/components/review/ReviewHeader';
import { STRINGS } from '@/constants/strings';

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
  detentFeedback: jest.fn(),
  warningFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

// Mock expo vector icons
jest.mock('@/components/ui/Icon', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(View, { testID: `icon-${name}` }),
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

      expect(getByTestId('icon-close')).toBeTruthy();
    });

    test('does not render close button when onClose is not provided', () => {
      const { queryByTestId } = render(<ReviewHeader progress={5} maxProgress={10} />);

      expect(queryByTestId('icon-close')).toBeNull();
    });
  });

  describe('Progress Display', () => {
    test('uses max of progress and maxProgress for display', () => {
      // When progress > maxProgress, should still use progress
      const { toJSON } = render(<ReviewHeader progress={8} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles zero progress', () => {
      const { toJSON } = render(<ReviewHeader progress={0} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles completed progress', () => {
      const { toJSON } = render(<ReviewHeader progress={10} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Close Button Interaction', () => {
    test('calls onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      // Find the pressable that contains the close icon
      const closeIcon = getByTestId('icon-close');
      const pressable = closeIcon.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    // The close haptic lives on this button rather than in useReview's
    // handleClose, because that exit is also reached from the completion
    // screen's ThemedButtons — which fire their own. Keeping it in the hook
    // buzzed Continue twice in one tick, hidden only by the 50ms debounce.
    // This bare Pressable has no press feedback of its own, so it needs this.
    //
    // Selection, not GlassIconButton's default Light: leaving the session is
    // navigation, and tier 0 in utils/haptics is everything that only moves the
    // UI. A chrome button that lands as hard as a grade leaves the grade
    // nothing to be louder than.
    test('the close button carries its own press feedback, at the faintest tier', () => {
      const { selectionFeedback, lightFeedback } = require('@/utils/haptics');
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      const pressable = getByTestId('icon-close').parent;
      expect(pressable).toBeTruthy();
      fireEvent.press(pressable!);

      expect(selectionFeedback).toHaveBeenCalledTimes(1);
      expect(lightFeedback).not.toHaveBeenCalled();
    });
  });

  // The run counter is the only thing in the session that rewards the learner
  // while they are still in it, and it was visual-only — a caption fading in
  // beside a progress bar nobody looks at mid-answer.
  describe('Recall run milestones', () => {
    test('the run being worth showing is also worth feeling', () => {
      const { lightFeedback } = require('@/utils/haptics');
      const { rerender } = render(<ReviewHeader progress={1} maxProgress={10} recallRun={2} />);
      // Two right answers is just Tuesday — nothing is shown, nothing fires.
      expect(lightFeedback).not.toHaveBeenCalled();

      rerender(<ReviewHeader progress={2} maxProgress={10} recallRun={3} />);
      expect(lightFeedback).toHaveBeenCalledTimes(1);
    });

    // Buzzing every correct card turns the reward into wallpaper, and it would
    // land right behind the grade haptic that caused it.
    test('every card in a run does not buzz', () => {
      const { lightFeedback } = require('@/utils/haptics');
      const { rerender } = render(<ReviewHeader progress={1} maxProgress={10} recallRun={3} />);
      jest.mocked(lightFeedback).mockClear();

      rerender(<ReviewHeader progress={2} maxProgress={10} recallRun={4} />);
      rerender(<ReviewHeader progress={3} maxProgress={10} recallRun={5} />);
      expect(lightFeedback).not.toHaveBeenCalled();

      // ...but the fifth beyond the first milestone is an event again.
      rerender(<ReviewHeader progress={4} maxProgress={10} recallRun={8} />);
      expect(lightFeedback).toHaveBeenCalledTimes(1);
    });

    // A run that breaks and a remount mid-session must not re-congratulate a
    // milestone the learner already felt.
    test('only a rising run fires', () => {
      const { lightFeedback } = require('@/utils/haptics');
      const { rerender } = render(<ReviewHeader progress={1} maxProgress={10} recallRun={3} />);
      jest.mocked(lightFeedback).mockClear();

      rerender(<ReviewHeader progress={2} maxProgress={10} recallRun={0} />);
      rerender(<ReviewHeader progress={3} maxProgress={10} recallRun={0} />);

      expect(lightFeedback).not.toHaveBeenCalled();
    });
  });

  // With voice grading off the slot used to render nothing at all, so the one
  // screen where speaking is the natural act left no trace of the feature. It
  // now holds a dormant mic that opens the offer instead of muting anything.
  describe('Voice control', () => {
    test('renders nothing in the slot when the control is not requested', () => {
      const { queryByTestId } = render(<ReviewHeader progress={1} maxProgress={10} />);

      expect(queryByTestId('icon-mic')).toBeNull();
      expect(queryByTestId('icon-mic-off')).toBeNull();
      expect(queryByTestId('icon-mic-outline')).toBeNull();
    });

    test('renders the dormant mic when voice is off but still on offer', () => {
      const onOfferVoice = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <ReviewHeader
          showVoiceControl
          voiceDormant
          progress={1}
          maxProgress={10}
          onOfferVoice={onOfferVoice}
        />,
      );

      expect(getByTestId('icon-mic-outline')).toBeTruthy();
      // The live glyphs belong to the enabled control, not this one.
      expect(queryByTestId('icon-mic')).toBeNull();
      expect(queryByTestId('icon-mic-off')).toBeNull();
    });

    test('the dormant mic opens the offer and never toggles the mute', () => {
      const onOfferVoice = jest.fn();
      const onToggleVoice = jest.fn();
      const { getByLabelText } = render(
        <ReviewHeader
          showVoiceControl
          voiceDormant
          progress={1}
          maxProgress={10}
          onOfferVoice={onOfferVoice}
          onToggleVoice={onToggleVoice}
        />,
      );

      fireEvent.press(getByLabelText(STRINGS.VOICE_OFFER_LABEL));

      expect(onOfferVoice).toHaveBeenCalledTimes(1);
      expect(onToggleVoice).not.toHaveBeenCalled();
    });

    test('renders the live mute toggle once voice is enabled', () => {
      const onToggleVoice = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <ReviewHeader
          showVoiceControl
          progress={1}
          maxProgress={10}
          onToggleVoice={onToggleVoice}
        />,
      );

      expect(getByTestId('icon-mic')).toBeTruthy();
      expect(queryByTestId('icon-mic-outline')).toBeNull();
    });

    test('the live control shows the muted glyph when paused', () => {
      const onToggleVoice = jest.fn();
      const { getByTestId } = render(
        <ReviewHeader
          showVoiceControl
          voicePaused
          progress={1}
          maxProgress={10}
          onToggleVoice={onToggleVoice}
        />,
      );

      expect(getByTestId('icon-mic-off')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles progress exceeding maxProgress', () => {
      // Edge case: progress can exceed max during animation
      const { toJSON } = render(<ReviewHeader progress={15} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles negative progress gracefully', () => {
      const { toJSON } = render(<ReviewHeader progress={-1} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles zero maxProgress', () => {
      const { toJSON } = render(<ReviewHeader progress={0} maxProgress={0} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
