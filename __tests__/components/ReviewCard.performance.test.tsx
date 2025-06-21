import { jest, test } from '@jest/globals';
import React from 'react';
import { measureRenders } from 'reassure';

// Mock complex dependencies that commonly cause issues
jest.mock('react-native-reanimated', () => {
  const mockReact = require('react');
  return {
    default: {
      View: mockReact.forwardRef(({ style, children, ...props }: any, ref: any) =>
        mockReact.createElement(
          'div',
          {
            ref,
            'data-testid': 'animated-view',
            style: style,
            ...props,
          },
          children
        )
      ),
      useSharedValue: jest.fn(() => ({ value: 0 })),
      useAnimatedStyle: jest.fn(() => ({})),
      withTiming: jest.fn(),
      cancelAnimation: jest.fn(),
      runOnJS: jest.fn(fn => fn),
    },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const mockReact = require('react');
  return {
    Gesture: {
      Pan: jest.fn(() => ({
        enabled: jest.fn(() => ({
          minDistance: jest.fn(() => ({
            activeOffsetX: jest.fn(() => ({
              onUpdate: jest.fn(() => ({
                onEnd: jest.fn(() => ({})),
              })),
            })),
          })),
        })),
      })),
      Tap: jest.fn(() => ({
        enabled: jest.fn(() => ({
          onEnd: jest.fn(() => ({})),
        })),
      })),
      Exclusive: jest.fn(() => ({})),
    },
    GestureDetector: mockReact.forwardRef(({ children, ...props }: any, ref: any) =>
      mockReact.createElement(
        'div',
        {
          ref,
          'data-testid': 'gesture-detector',
          ...props,
        },
        children
      )
    ),
  };
});

jest.mock('@/components/review/WordDisplay', () => {
  const mockReact = require('react');
  return {
    __esModule: true,
    default: mockReact.forwardRef(({ word, fontSize, ...props }: any, ref: any) =>
      mockReact.createElement(
        'div',
        {
          ref,
          'data-testid': 'word-display',
          style: { fontSize, minHeight: 200 },
          ...props,
        },
        word
      )
    ),
  };
});

jest.mock('@/constants/layout', () => ({
  WORD_AREA_MIN_HEIGHT: 200,
  useScreenWidth: jest.fn(() => 375),
}));

jest.mock('@/constants/animation', () => ({
  TIMING_CONFIG: {
    FAST: { duration: 150 },
  },
}));

// Import the actual component after mocking dependencies
const ReviewCard = require('../../components/review/ReviewCard').default;

// Create realistic test scenarios with varying complexity
const createProps = (complexity: 'minimal' | 'typical' | 'heavy' | 'edge-case') => {
  const baseProps = {
    word: 'كتاب',
    fontSize: 24,
    onSwipeLeft: jest.fn(),
    onSwipeRight: jest.fn(),
    onTap: jest.fn(),
    isUpdating: false,
    isTransitioning: false,
    opacityStyle: {},
    testID: 'review-card',
  };

  switch (complexity) {
    case 'minimal':
      return { ...baseProps, word: 'كتاب' };
    case 'typical':
      return { ...baseProps, word: 'المدرسة', fontSize: 28 };
    case 'heavy':
      return { ...baseProps, word: 'والمدرسون', fontSize: 32, isUpdating: true };
    case 'edge-case':
      return { ...baseProps, word: 'والطلاب', fontSize: 36, isTransitioning: true };
    default:
      return baseProps;
  }
};

test('ReviewCard performance - minimal scenario', async () => {
  await measureRenders(<ReviewCard {...createProps('minimal')} />);
});

test('ReviewCard performance - typical scenario', async () => {
  await measureRenders(<ReviewCard {...createProps('typical')} />);
});

test('ReviewCard performance - heavy scenario', async () => {
  await measureRenders(<ReviewCard {...createProps('heavy')} />);
});

test('ReviewCard performance - edge case scenario', async () => {
  await measureRenders(<ReviewCard {...createProps('edge-case')} />);
});

// Test performance under rapid prop changes (simulating fast swiping)
test('ReviewCard performance - rapid word changes', async () => {
  const TestComponent = ({ word }: { word: string }) => (
    <ReviewCard {...createProps('typical')} word={word} />
  );

  await measureRenders(<TestComponent word="كتاب" />, {
    runs: 10,
    warmupRuns: 3,
  });
});
