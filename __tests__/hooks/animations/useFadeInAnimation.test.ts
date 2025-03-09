/**
 * Very basic tests for useFadeInAnimation
 *
 * These tests only verify the hook's API surface, not the animation behavior.
 * The actual animation behavior is handled by the react-native-reanimated library,
 * which we're mocking here.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFadeInAnimation } from '../../../hooks/animations';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn(val => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({ opacity: 0, transform: [{ translateY: 15 }] })),
    withTiming: jest.fn(val => val),
    withDelay: jest.fn((_, val) => val),
  };
});

describe('useFadeInAnimation', () => {
  it('has the expected API surface', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('startAnimation');
    expect(typeof result.current.startAnimation).toBe('function');
  });
});
