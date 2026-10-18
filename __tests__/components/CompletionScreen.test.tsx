/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * CompletionScreen Component Tests
 *
 * Tests the session completion screen shown after:
 * - Practice session completion
 * - Generic success flows
 *
 * Critical component that displays:
 * - Success icon and message
 * - Session metrics (words reviewed, streaks, etc.)
 * - Continue button for navigation
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { CompletionScreen } from '@/components/review/CompletionScreen';
import { STRINGS } from '@/constants/strings';
import type { SessionMetrics } from '@/types/review.types';

// Mock dependencies

jest.mock('@/components/ui/Icon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Icon: ({ name, testID }: { name: string; testID?: string }) => (
      <Text testID={testID || 'icon'}>{name}</Text>
    ),
  };
});

// Use shared mock factory from componentMocks.tsx
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/components/primitives/ThemedButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedButton: ({ title, children, testID, onPress }: any) => (
      <div data-testid={testID} onClick={onPress}>
        {title && <Text>{title}</Text>}
        {children}
      </div>
    ),
  };
});

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/practice', () => ({
  useStudyStreak: () => ({
    streak: { currentStreak: 0, longestStreak: 0, lastReadingDate: null, totalReadingDays: 0 },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/review', () => ({
  useReviewCompletion: jest.fn(),
  useNotificationPriming: jest.fn((..._args: unknown[]) => ({
    showPrimingCard: false,
    resolved: true,
    accept: jest.fn(),
    decline: jest.fn(),
  })),
  // Default: the offer is already answered, so `rendered` cannot make it show.
  useVoicePriming: jest.fn((..._args: unknown[]) => ({
    showPrimingCard: false,
    accept: jest.fn(),
    decline: jest.fn(),
  })),
  useEncouragingMetrics: jest.fn((..._args: unknown[]) => [
    {
      type: 'wordsReviewed',
      text: '10 words reviewed',
    },
    {
      type: 'streak',
      text: '5-day streak',
    },
  ]),
}));

const {
  useReviewCompletion,
  useEncouragingMetrics,
  useNotificationPriming,
  useVoicePriming,
} = require('@/hooks/review');

describe('CompletionScreen Component', () => {
  const createMockMetrics = (overrides: Partial<SessionMetrics> = {}): SessionMetrics => ({
    wordsReviewed: 10,
    wordsKnown: 8,
    wordsUnknown: 2,
    firstAttemptKnown: 8,
    firstAttemptUnknown: 2,
    currentStreak: 5,
    longestStreak: 5,
    masteredWords: 3,
    averageStabilityIncrease: 2.5,
    startTime: Date.now() - 120000, // 2 minutes ago
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // resetMocks: true strips factory implementations — re-install the ones
    // the component destructures unconditionally
    useNotificationPriming.mockReturnValue({
      showPrimingCard: false,
      resolved: true,
      accept: jest.fn(),
      decline: jest.fn(),
    });
    useVoicePriming.mockReturnValue({
      showPrimingCard: false,
      accept: jest.fn(),
      decline: jest.fn(),
    });
  });

  describe('Basic Rendering', () => {
    test('renders completion screen with default props', () => {
      const { getByText } = render(<CompletionScreen />);

      // Default title from STRINGS.SESSION_COMPLETE
      expect(getByText('Session complete')).toBeTruthy();
    });

    test('renders with custom title', () => {
      const { getByText } = render(<CompletionScreen title="Great Job!" />);

      expect(getByText('Great Job!')).toBeTruthy();
    });

    test('renders success icon', () => {
      const { getByText } = render(<CompletionScreen />);

      // Default icon is 'checkmark-circle'
      expect(getByText('checkmark-circle')).toBeTruthy();
    });

    test('renders with testID', () => {
      const { getByTestId } = render(<CompletionScreen testID="completion-screen" />);

      expect(getByTestId('completion-screen')).toBeTruthy();
    });
  });

  describe('Session Metrics Display', () => {
    test('displays session metrics when provided', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 15,
        currentStreak: 7,
      });

      useEncouragingMetrics.mockReturnValue([
        {
          type: 'wordsReviewed',
          text: '15 words reviewed',
        },
        {
          type: 'streak',
          text: '7-day streak',
        },
      ]);

      const { getByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      expect(getByText('15 words reviewed')).toBeTruthy();
      expect(getByText('7-day streak')).toBeTruthy();
    });

    test('displays multiple encouraging metrics', () => {
      const metrics = createMockMetrics();

      useEncouragingMetrics.mockReturnValue([
        {
          type: 'wordsReviewed',
          text: '10 words reviewed',
        },
        {
          type: 'streak',
          text: '5-day streak',
        },
        {
          type: 'mastered',
          text: '3 words mastered',
        },
      ]);

      const { getByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      expect(getByText('10 words reviewed')).toBeTruthy();
      expect(getByText('5-day streak')).toBeTruthy();
      expect(getByText('3 words mastered')).toBeTruthy();
    });

    test('handles metrics with zero values', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 0,
        currentStreak: 0,
      });

      useEncouragingMetrics.mockReturnValue([]);

      const { queryByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      // Should not display metrics with zero values
      expect(queryByText(/0 words/)).toBeFalsy();
    });
  });

  // Plain rows in one ink: the only icon on the screen is the checkmark that
  // carries the success haptic. Each row used to sit in a card behind an icon
  // in a tinted square — a trophy, a flame, an hourglass.
  describe('Plain rows', () => {
    test('rows carry no icon of their own', () => {
      useEncouragingMetrics.mockReturnValue([
        { type: 'due', text: '10 words reviewed' },
        { type: 'daily_streak', text: '5-day streak' },
        { type: 'mastery', text: '3 words mastered' },
      ]);

      const { getAllByTestId, getByText } = render(
        <CompletionScreen sessionMetrics={createMockMetrics()} />,
      );

      expect(getByText('10 words reviewed')).toBeTruthy();
      expect(getAllByTestId('icon')).toHaveLength(1);
      expect(getByText('checkmark-circle')).toBeTruthy();
    });
  });

  describe('Review Completion Hooks', () => {
    test('calls useReviewCompletion with metrics', () => {
      const metrics = createMockMetrics();

      render(<CompletionScreen sessionMetrics={metrics} />);

      expect(useReviewCompletion).toHaveBeenCalledWith(metrics);
    });

    test('calls useEncouragingMetrics with metrics and dailyStreak', () => {
      const metrics = createMockMetrics();

      render(<CompletionScreen sessionMetrics={metrics} />);

      expect(useEncouragingMetrics).toHaveBeenCalledWith(
        metrics,
        0, // dailyStreak from useStudyStreak mock
      );
    });

    test('calls useReviewCompletion even when there are no metrics', () => {
      useReviewCompletion.mockClear();

      render(<CompletionScreen />);

      expect(useReviewCompletion).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Continue Button', () => {
    test('renders continue button with default text', () => {
      const { getByText } = render(<CompletionScreen />);

      expect(getByText('Continue')).toBeTruthy();
    });

    test('button is pressable', () => {
      const { getByText } = render(<CompletionScreen />);

      const button = getByText('Continue');

      expect(() => fireEvent.press(button)).not.toThrow();
    });
  });

  describe('Different Completion Scenarios', () => {
    test('renders for successful practice session', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 20,
        wordsKnown: 18,
        currentStreak: 10,
      });

      useEncouragingMetrics.mockReturnValue([
        {
          type: 'wordsReviewed',
          text: '20 words reviewed',
        },
        {
          type: 'streak',
          text: '10-day streak',
        },
      ]);

      const { getByText } = render(
        <CompletionScreen title="Excellent Work!" sessionMetrics={metrics} />,
      );

      expect(getByText('Excellent Work!')).toBeTruthy();
      expect(getByText('20 words reviewed')).toBeTruthy();
      expect(getByText('10-day streak')).toBeTruthy();
    });

    test('renders for small session (few words)', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 3,
        wordsKnown: 3,
      });

      useEncouragingMetrics.mockReturnValue([
        {
          type: 'wordsReviewed',
          text: '3 words reviewed',
        },
      ]);

      const { getByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      expect(getByText('3 words reviewed')).toBeTruthy();
    });

    test('renders for perfect session (all known)', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 10,
        wordsKnown: 10,
        wordsUnknown: 0,
      });

      useEncouragingMetrics.mockReturnValue([
        {
          type: 'perfect',
          text: 'Perfect session!',
        },
      ]);

      const { getByText } = render(
        <CompletionScreen title="Perfect Session!" sessionMetrics={metrics} />,
      );

      expect(getByText('Perfect Session!')).toBeTruthy();
      expect(getByText('Perfect session!')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined sessionMetrics', () => {
      expect(() => render(<CompletionScreen />)).not.toThrow();
    });

    test('handles empty title', () => {
      const { queryByText } = render(<CompletionScreen title="" />);

      // Empty title should render but be empty
      expect(queryByText('Session complete')).toBeFalsy();
    });

    test('handles very long title', () => {
      const longTitle = 'A'.repeat(200);

      const { getByText } = render(<CompletionScreen title={longTitle} />);

      expect(getByText(longTitle)).toBeTruthy();
    });

    test('handles special characters in title', () => {
      const { getByText } = render(<CompletionScreen title="Great! You've completed 100% 🎉" />);

      expect(getByText("Great! You've completed 100% 🎉")).toBeTruthy();
    });

    test('handles RTL text in title', () => {
      const { getByText } = render(<CompletionScreen title="أحسنت! جلسة ممتازة" />);

      expect(getByText('أحسنت! جلسة ممتازة')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('renders without performance degradation', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 100,
      });

      const start = Date.now();
      render(<CompletionScreen sessionMetrics={metrics} />);
      const elapsed = Date.now() - start;

      // Should render quickly even with many metrics
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Regression Tests', () => {
    test('should call review completion hook for review flow', () => {
      const metrics = createMockMetrics();

      useReviewCompletion.mockClear();

      render(<CompletionScreen sessionMetrics={metrics} />);

      expect(useReviewCompletion).toHaveBeenCalledWith(metrics);
    });

    test('should display metrics in order of importance', () => {
      const metrics = createMockMetrics();

      useEncouragingMetrics.mockReturnValue([
        {
          type: 'streak',
          text: '7-day streak',
        },
        {
          type: 'wordsReviewed',
          text: '10 words reviewed',
        },
      ]);

      const { getAllByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      // Both metrics should be displayed
      expect(getAllByText(/streak|reviewed/)).toBeTruthy();
    });
  });

  // Both priming cards share one slot above the anchored button. Rendering both
  // would stack two asks on a celebration screen and get neither read.
  describe('Priming slot', () => {
    const notificationOn = () => ({
      showPrimingCard: true,
      resolved: true,
      accept: jest.fn(),
      decline: jest.fn(),
    });
    // Mirrors the real hook: it folds `rendered` into the flag it returns, so an
    // eligible voice offer that was not given the slot reports itself as hidden.
    const voiceEligible = () =>
      jest.fn((_source, rendered = true) => ({
        showPrimingCard: Boolean(rendered),
        accept: jest.fn(),
        decline: jest.fn(),
      }));

    test('shows the notification ask when it wants the slot', () => {
      useNotificationPriming.mockReturnValue(notificationOn());

      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeTruthy();
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
    });

    test('shows the voice offer when the slot is free', () => {
      useVoicePriming.mockImplementation(voiceEligible());

      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeTruthy();
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeNull();
    });

    // Notifications win a collision — that ask has a two-impression budget for
    // the life of the install, while the voice offer stands until answered. Voice
    // reaching the early completions is enforced upstream by
    // VOICE_FIRST_SESSION_GRACE, not by anything on this screen.
    test('notifications win when both are eligible — never both', () => {
      useNotificationPriming.mockReturnValue(notificationOn());
      useVoicePriming.mockImplementation(voiceEligible());

      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeTruthy();
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
    });

    // The `rendered` argument is the whole mechanism keeping the voice funnel
    // honest, so assert it is actually passed rather than trusting the wiring.
    test('tells the voice offer it does NOT have the slot when notifications win', () => {
      useNotificationPriming.mockReturnValue(notificationOn());
      useVoicePriming.mockImplementation(voiceEligible());

      render(<CompletionScreen />);
      expect(useVoicePriming).toHaveBeenCalledWith('completion', false);
    });

    // Notification eligibility is async, so before it settles the slot is not yet
    // free — the voice card must not claim it and log an impression for a card
    // the reminders ask is about to take.
    test('withholds the slot until notification eligibility has resolved', () => {
      useNotificationPriming.mockReturnValue({
        showPrimingCard: false,
        resolved: false,
        accept: jest.fn(),
        decline: jest.fn(),
      });
      useVoicePriming.mockImplementation(voiceEligible());

      const { queryByText } = render(<CompletionScreen />);
      expect(useVoicePriming).toHaveBeenCalledWith('completion', false);
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeNull();
    });

    test('neither renders when both decline the slot', () => {
      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeNull();
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
    });
  });
});
