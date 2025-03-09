/**
 * Very basic tests for useCardAnimation
 *
 * These tests only verify the hook's API surface, not the animation behavior.
 * The actual animation behavior is handled by the react-native-reanimated library,
 * which we're mocking here.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useCardAnimation } from '../../../hooks/animations';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn(val => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({ opacity: 1, transform: [{ scale: 1 }] })),
    withSpring: jest.fn(val => val),
    interpolate: jest.fn(() => 1),
    Extrapolate: { CLAMP: 'clamp' },
  };
});

describe('useCardAnimation', () => {
  it('has the expected API surface', () => {
    const { result } = renderHook(() => useCardAnimation());

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('handlePressIn');
    expect(result.current).toHaveProperty('handlePressOut');
    expect(result.current).toHaveProperty('pressed');
    expect(typeof result.current.handlePressIn).toBe('function');
    expect(typeof result.current.handlePressOut).toBe('function');
  });

  it('initializes with scale 1 and opacity 1 in animation style', () => {
    const { result } = renderHook(() => useCardAnimation());

    // Check the initial animated style values
    expect(result.current.animatedStyle.transform[0]).toHaveProperty('scale', 1);
    expect(result.current.animatedStyle).toHaveProperty('opacity', 1);
  });

  it('accepts custom scale and opacity parameters', () => {
    const customScale = 0.9;
    const customOpacity = 0.8;

    // Should be able to initialize with custom parameters
    const { result } = renderHook(() => useCardAnimation(customScale, customOpacity));

    // It should still return the expected interface
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('handlePressIn');
    expect(result.current).toHaveProperty('handlePressOut');
  });
});
