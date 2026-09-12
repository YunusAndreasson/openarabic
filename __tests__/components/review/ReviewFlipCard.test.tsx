import { act, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createRef } from 'react';

import type { ReviewCardHandle } from '@/components/review/ReviewFlipCard';
import { ReviewFlipCard } from '@/components/review/ReviewFlipCard';

const mockTranslateX = {
  get: jest.fn(() => 120),
  set: jest.fn(),
};
const mockIsAnimating = {
  get: jest.fn(() => true),
  set: jest.fn(),
};
let mockFlipValue = 1;
const mockFlipProgress = {
  get: () => mockFlipValue,
  set: jest.fn((value: number) => {
    mockFlipValue = value;
  }),
};
const mockResetVerdict = jest.fn();

jest.mock('react-native-reanimated', () => {
  const base = require('@/__tests__/helpers/componentMocks').createReanimatedMock();
  return {
    ...base,
    cancelAnimation: jest.fn(),
    withTiming: (value: number) => value,
    interpolateColor: () => 'transparent',
    useReducedMotion: () => false,
    useSharedValue: () => mockFlipProgress,
  };
});

jest.mock('@/hooks/gestures/useSwipeGesture', () => ({
  useSwipeGesture: () => ({
    translateX: mockTranslateX,
    isAnimatingRef: mockIsAnimating,
    swipeThreshold: 80,
    commitTo: jest.fn(),
  }),
}));

jest.mock('@/hooks/review/useCardVerdict', () => ({
  VERDICT_TONE: { NONE: 0, CORRECT: 1, ALMOST: 2, WRONG: 3 },
  useCardVerdict: () => ({
    verdictTone: { get: () => 0 },
    verdictLevel: { get: () => 0 },
    verdictShakePhase: { get: () => 0 },
    playVerdict: jest.fn(),
    resetVerdict: mockResetVerdict,
  }),
}));

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);
jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);
jest.mock('@/components/primitives/ThemedText', () => ({ ThemedText: () => null }));
jest.mock('@/components/review/WordDisplay', () => ({ WordDisplay: () => null }));

beforeEach(() => {
  mockFlipValue = 0;
  mockFlipProgress.set.mockImplementation((value: number) => {
    mockFlipValue = value;
  });
});

describe('ReviewFlipCard rejected-grade recovery', () => {
  test('recentres the attempted grade without resetting the revealed face', () => {
    const ref = createRef<ReviewCardHandle>();
    render(
      <ReviewFlipCard
        ref={ref}
        word="كتاب"
        answer="book"
        revealed
        onReveal={jest.fn()}
        opacityStyle={{}}
        wordKey="word-1"
      />,
    );

    mockTranslateX.set.mockClear();
    mockIsAnimating.set.mockClear();
    mockFlipProgress.set.mockClear();
    mockResetVerdict.mockClear();

    act(() => ref.current?.resetGradePresentation());

    expect(mockTranslateX.set).toHaveBeenCalledWith(0);
    expect(mockIsAnimating.set).toHaveBeenCalledWith(false);
    expect(mockResetVerdict).toHaveBeenCalledWith('word-1');
    expect(mockFlipProgress.set).not.toHaveBeenCalled();
  });
});

describe('ReviewFlipCard face synchronization', () => {
  test('keeps an already revealed card on its answer face after mounting', () => {
    render(
      <ReviewFlipCard
        word="كتاب"
        answer="book"
        revealed
        onReveal={jest.fn()}
        opacityStyle={{}}
        wordKey="word-1"
      />,
    );
    expect(mockFlipProgress.get()).toBe(1);
  });

  test('reveals the current card and resets the next card to its question face', () => {
    const props = {
      word: 'كتاب',
      answer: 'book',
      onReveal: jest.fn(),
      opacityStyle: {},
      wordKey: 'word-1',
    };
    const { rerender } = render(<ReviewFlipCard {...props} revealed={false} />);
    expect(mockFlipProgress.get()).toBe(0);
    rerender(<ReviewFlipCard {...props} revealed />);
    expect(mockFlipProgress.get()).toBe(1);
    rerender(<ReviewFlipCard {...props} wordKey="word-2" revealed={false} />);
    expect(mockFlipProgress.get()).toBe(0);
  });
});
