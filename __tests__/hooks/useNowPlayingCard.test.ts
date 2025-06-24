import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

// Mock animation constants before importing the hook
jest.mock('@/constants/animation', () => ({
  TIMING_CONFIG: {
    FAST: { duration: 150, easing: () => {} },
    MEDIUM: { duration: 250, easing: () => {} },
    SLOW: { duration: 350, easing: () => {} },
    GENTLE: { duration: 300, easing: () => {} },
  },
  NOW_PLAYING_DISMISS_SCALE: 0.92,
  NOW_PLAYING_STOP_PRESS_SCALE: 0.85,
}));

import { useNowPlayingCard } from '@/hooks/listen/useNowPlayingCard';

const mockColors = {
  elevation2: '#222',
  card: '#fff',
  border: '#444',
  cardBorder: '#ccc',
  shadow: '#000',
  tint: '#0f0',
  buttonOverlay: '#bbb',
  warning: '#f90',
};

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => mockColors,
}));

const mockIsDarkMode = jest.fn();
jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => mockIsDarkMode(),
}));

jest.mock('@/hooks/animations', () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock('react-native-reanimated', () => {
  const cancelAnimation = jest.fn();
  return {
    default: {
      View: 'View',
      Text: 'Text',
      ScrollView: 'ScrollView',
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v = 0) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    interpolate: (val: number, input: number[], output: number[]) => {
      if (input[1] === input[0]) return output[0];
      const ratio = (val - input[0]) / (input[1] - input[0]);
      const clamped = Math.max(0, Math.min(1, ratio));
      return output[0] + (output[1] - output[0]) * clamped;
    },
    Extrapolation: { CLAMP: 'clamp' },
    cancelAnimation,
  };
});

describe('useNowPlayingCard', () => {
  beforeEach(() => {
    mockIsDarkMode.mockReset();
  });

  it('handles visibility changes correctly', () => {
    mockIsDarkMode.mockReturnValue(false);
    const onStop = jest.fn();
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: true,
        onStop,
      })
    );

    expect(result.current.cardAnimatedStyle).toBeDefined();
    expect(result.current.backgroundImageStyle).toBeDefined();
    expect(result.current.handleStopPress).toBeDefined();
  });

  it('returns proper animation styles and handlers', () => {
    mockIsDarkMode.mockReturnValue(false);
    const onStop = jest.fn();
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: false,
        onStop,
      })
    );

    expect(result.current.cardAnimatedStyle).toBeDefined();
    expect(result.current.backgroundImageStyle).toBeDefined();
    expect(result.current.buttonAnimatedStyle).toBeDefined();
    expect(result.current.handleStopPressIn).toBeDefined();
    expect(result.current.handleStopPressOut).toBeDefined();
  });

  it('provides dynamic styles based on theme and timer state', () => {
    mockIsDarkMode.mockReturnValue(true);
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: true,
        onStop: jest.fn(),
        isTimerActive: true,
      })
    );

    expect(result.current.dynamicStyles.container).toEqual(
      expect.objectContaining({
        backgroundColor: mockColors.elevation2,
        borderColor: mockColors.border,
        shadowColor: mockColors.shadow,
      })
    );
    expect(result.current.dynamicStyles.timerButton).toEqual(
      expect.objectContaining({
        backgroundColor: `${mockColors.warning}20`,
        borderColor: mockColors.warning,
        borderWidth: 1,
      })
    );
  });

  it('calls onStop when handleStopPress is invoked', () => {
    mockIsDarkMode.mockReturnValue(false);
    const onStop = jest.fn();
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: true,
        onStop,
      })
    );

    act(() => {
      result.current.handleStopPress();
    });

    expect(onStop).toHaveBeenCalled();
  });
});
