/**
 * Very basic tests for useButtonAnimation
 *
 * These tests only verify the hook's API surface, not the animation behavior.
 * The actual animation behavior is handled by the react-native-reanimated library,
 * which we're mocking here.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useButtonAnimation } from '../../../hooks/animations';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn(val => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({ transform: [{ scale: 1 }] })),
    withSpring: jest.fn(val => val),
    interpolate: jest.fn(() => 1),
    Extrapolate: { CLAMP: 'clamp' },
  };
});

describe('useButtonAnimation', () => {
  it('has the expected API surface', () => {
    const { result } = renderHook(() => useButtonAnimation());

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('handlePressIn');
    expect(result.current).toHaveProperty('handlePressOut');
    expect(typeof result.current.handlePressIn).toBe('function');
    expect(typeof result.current.handlePressOut).toBe('function');
  });
});
