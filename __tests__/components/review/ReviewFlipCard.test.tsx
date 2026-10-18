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
// Renders its children as plain text. It used to render nothing, which made
// every assertion about the card's copy unable to fail in either direction: a
// line that should be there could never be found, and a line that should be
// held back was "absent" whether the card held it back or not.
jest.mock('@/components/primitives/ThemedText', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children }: { children?: unknown }) => createElement(Text, null, children),
  };
});
// The word itself is not under test, but the answer, the transcript and the
// voice slot are all its children, so it has to hand them through.
jest.mock('@/components/review/WordDisplay', () => ({
  WordDisplay: ({ children }: { children?: unknown }) => children ?? null,
}));

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
  test('exposes only the active face to accessibility', () => {
    const props = {
      word: 'كتاب',
      answer: 'book',
      onReveal: jest.fn(),
      opacityStyle: {},
      wordKey: 'word-1',
    };
    const view = render(<ReviewFlipCard {...props} revealed={false} />);
    expect(view.queryByText('Book')).toBeNull();
    expect(view.getByLabelText('Show answer')).toBeTruthy();

    view.rerender(<ReviewFlipCard {...props} revealed />);
    expect(view.getByText('Book')).toBeTruthy();
    expect(view.queryByLabelText('Show answer')).toBeNull();
  });

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

// A voice miss is graded from the card: the answer and what the recognizer
// heard sit together under the Arabic. The heard line used to live in the
// action band, which reserved a line for it in every state.
describe('ReviewFlipCard voice miss', () => {
  const props = {
    word: 'كتاب',
    answer: 'book',
    revealed: false,
    onReveal: jest.fn(),
    opacityStyle: {},
    wordKey: 'word-1',
  };
  const heard = 'You said “boot”';

  test('shows what was heard under the disclosed answer', () => {
    const view = render(<ReviewFlipCard {...props} discloseAnswer discloseCaption={heard} />);

    expect(view.getByText(heard)).toBeTruthy();
  });

  test('holds the heard line back while the answer is not disclosed', () => {
    const view = render(<ReviewFlipCard {...props} discloseCaption={heard} />);

    expect(view.queryByText(heard)).toBeNull();
  });

  // A hearing failure discloses nothing, so "Try again" is a real retry. The
  // card says the app missed it and keeps the English to itself — `answer`
  // stays empty until something actually discloses it.
  test('a hearing failure shows its caption without the answer', () => {
    const notHeard = "Didn't catch that";
    const view = render(
      <ReviewFlipCard {...props} answer="" discloseAnswer discloseCaption={notHeard} />,
    );

    expect(view.getByText(notHeard)).toBeTruthy();
    expect(view.queryByText('Book')).toBeNull();
  });
});
