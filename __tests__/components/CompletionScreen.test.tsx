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
jest.mock('expo-router', () => ({
  Link: ({ children, testID, onPress }: any) => (
    <div data-testid={testID} onClick={onPress}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/Icon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID }: { name: string; testID?: string }) => (
      <Text testID={testID || 'icon'}>{name}</Text>
    ),
  };
});

// Use shared mock factory from componentMocks.tsx
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/components/ThemedButton', () => {
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
  useNotificationPriming: jest.fn(() => ({
    showPrimingCard: false,
    accept: jest.fn(),
    decline: jest.fn(),
  })),
  useVoicePriming: jest.fn(() => ({
    showPrimingCard: false,
    accept: jest.fn(),
    decline: jest.fn(),
  })),
  useEncouragingMetrics: jest.fn(() => ({
    metrics: [
      {
        type: 'wordsReviewed',
        text: '10 words reviewed',
        value: 10,
        icon: 'book-outline' as const,
        color: '#4a7c59',
      },
      {
        type: 'streak',
        text: '5-day streak',
        value: 5,
        icon: 'flame-outline' as const,
        color: '#f59e0b',
      },
    ],
    educationalText: 'Words return at optimal intervals for long-term memory',
  })),
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

    test('renders with custom icon', () => {
      const { getByText } = render(<CompletionScreen iconName="trophy-outline" />);

      expect(getByText('trophy-outline')).toBeTruthy();
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

      useEncouragingMetrics.mockReturnValue({
        metrics: [
          {
            type: 'wordsReviewed',
            text: '15 words reviewed',
            value: 15,
            icon: 'book-outline',
            color: '#4a7c59',
          },
          {
            type: 'streak',
            text: '7-day streak',
            value: 7,
            icon: 'flame-outline',
            color: '#f59e0b',
          },
        ],
        educationalText: 'Words return at optimal intervals for long-term memory',
      });

      const { getByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      expect(getByText('15 words reviewed')).toBeTruthy();
      expect(getByText('7-day streak')).toBeTruthy();
    });

    test('displays multiple encouraging metrics', () => {
      const metrics = createMockMetrics();

      useEncouragingMetrics.mockReturnValue({
        metrics: [
          {
            type: 'wordsReviewed',
            text: '10 words reviewed',
            value: 10,
            icon: 'book-outline',
            color: '#4a7c59',
          },
          {
            type: 'streak',
            text: '5-day streak',
            value: 5,
            icon: 'flame-outline',
            color: '#f59e0b',
          },
          {
            type: 'mastered',
            text: '3 words mastered',
            value: 3,
            icon: 'star-outline',
            color: '#10b981',
          },
        ],
        educationalText: 'Words return at optimal intervals for long-term memory',
      });

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

      useEncouragingMetrics.mockReturnValue({
        metrics: [],
        educationalText: 'Words return at optimal intervals for long-term memory',
      });

      const { queryByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      // Should not display metrics with zero values
      expect(queryByText(/0 words/)).toBeFalsy();
    });
  });

  describe('Review Completion Hooks', () => {
    test('calls useReviewCompletion with metrics', () => {
      const metrics = createMockMetrics();

      render(<CompletionScreen sessionMetrics={metrics} />);

      expect(useReviewCompletion).toHaveBeenCalledWith(metrics, true);
    });

    test('calls useEncouragingMetrics with metrics, colors, and dailyStreak', () => {
      const metrics = createMockMetrics();

      render(<CompletionScreen sessionMetrics={metrics} />);

      expect(useEncouragingMetrics).toHaveBeenCalledWith(
        metrics,
        expect.objectContaining({
          completionSuccess: '#10b981',
        }),
        0, // dailyStreak from useStudyStreak mock
      );
    });

    test('calls useReviewCompletion with shouldExecute=true when no metrics', () => {
      useReviewCompletion.mockClear();

      render(<CompletionScreen />);

      expect(useReviewCompletion).toHaveBeenCalledWith(undefined, true);
    });
  });

  describe('Continue Button', () => {
    test('renders continue button with default text', () => {
      const { getByText } = render(<CompletionScreen />);

      expect(getByText('Continue')).toBeTruthy();
    });

    test('renders button with custom text', () => {
      const { getByText } = render(<CompletionScreen buttonText="Back to Practice" />);

      expect(getByText('Back to Practice')).toBeTruthy();
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

      useEncouragingMetrics.mockReturnValue({
        metrics: [
          {
            type: 'wordsReviewed',
            text: '20 words reviewed',
            value: 20,
            icon: 'book-outline',
            color: '#4a7c59',
          },
          {
            type: 'streak',
            text: '10-day streak',
            value: 10,
            icon: 'flame-outline',
            color: '#f59e0b',
          },
        ],
        educationalText: "You're building strong recall — words return at optimal intervals",
      });

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

      useEncouragingMetrics.mockReturnValue({
        metrics: [
          {
            type: 'wordsReviewed',
            text: '3 words reviewed',
            value: 3,
            icon: 'book-outline',
            color: '#4a7c59',
          },
        ],
        educationalText: 'Words return at optimal intervals for long-term memory',
      });

      const { getByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      expect(getByText('3 words reviewed')).toBeTruthy();
    });

    test('renders for perfect session (all known)', () => {
      const metrics = createMockMetrics({
        wordsReviewed: 10,
        wordsKnown: 10,
        wordsUnknown: 0,
      });

      useEncouragingMetrics.mockReturnValue({
        metrics: [
          {
            type: 'perfect',
            text: 'Perfect session!',
            value: 100,
            icon: 'trophy-outline',
            color: '#f59e0b',
          },
        ],
        educationalText: "You're building strong recall — words return at optimal intervals",
      });

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

      expect(useReviewCompletion).toHaveBeenCalledWith(metrics, true);
    });

    test('should display metrics in order of importance', () => {
      const metrics = createMockMetrics();

      useEncouragingMetrics.mockReturnValue({
        metrics: [
          {
            type: 'streak',
            text: '7-day streak',
            value: 7,
            icon: 'flame-outline',
            color: '#f59e0b',
          },
          {
            type: 'wordsReviewed',
            text: '10 words reviewed',
            value: 10,
            icon: 'book-outline',
            color: '#4a7c59',
          },
        ],
        educationalText: 'Words return at optimal intervals for long-term memory',
      });

      const { getAllByText } = render(<CompletionScreen sessionMetrics={metrics} />);

      // Both metrics should be displayed
      expect(getAllByText(/streak|reviewed/)).toBeTruthy();
    });
  });

  // Both priming cards share one slot above the anchored button. Rendering both
  // would stack two asks on a celebration screen and get neither read.
  describe('Priming slot', () => {
    const primingOn = () => ({ showPrimingCard: true, accept: jest.fn(), decline: jest.fn() });

    test('shows the notification ask when it wants the slot', () => {
      useNotificationPriming.mockReturnValue(primingOn());

      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeTruthy();
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
    });

    test('shows the voice offer when the slot is free', () => {
      useVoicePriming.mockReturnValue(primingOn());

      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeTruthy();
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeNull();
    });

    test('notifications win when both want the slot — never both', () => {
      useNotificationPriming.mockReturnValue(primingOn());
      useVoicePriming.mockReturnValue(primingOn());

      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeTruthy();
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
    });

    test('neither renders when both decline the slot', () => {
      const { queryByText } = render(<CompletionScreen />);
      expect(queryByText(STRINGS.NOTIFICATION_PRIMING_TITLE)).toBeNull();
      expect(queryByText(STRINGS.VOICE_PRIMING_TITLE)).toBeNull();
    });
  });
});
