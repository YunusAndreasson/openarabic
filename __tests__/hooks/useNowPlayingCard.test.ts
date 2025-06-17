import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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

  it('formats time and progress correctly', () => {
    mockIsDarkMode.mockReturnValue(false);
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: true,
        article: { id: 1 } as any,
        progress: 30000,
        duration: 60000,
        onStop: jest.fn(),
      })
    );

    expect(result.current.timeCalculations).toEqual({
      currentTime: '0:30',
      totalTime: '1:00',
      progressPercentage: 50,
    });
  });

  it('handles invalid values in time calculations', () => {
    mockIsDarkMode.mockReturnValue(false);
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: true,
        article: { id: 1 } as any,
        progress: Infinity,
        duration: NaN,
        onStop: jest.fn(),
      })
    );

    expect(result.current.timeCalculations).toEqual({
      currentTime: '0:00',
      totalTime: '0:00',
      progressPercentage: 0,
    });
  });

  it('provides dynamic styles based on theme and timer state', () => {
    mockIsDarkMode.mockReturnValue(true);
    const { result } = renderHook(() =>
      useNowPlayingCard({
        isVisible: true,
        article: { id: 1 } as any,
        progress: 0,
        duration: 0,
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
        article: { id: 1 } as any,
        progress: 0,
        duration: 0,
        onStop,
      })
    );

    act(() => {
      result.current.handleStopPress();
    });

    expect(onStop).toHaveBeenCalled();
  });
});
