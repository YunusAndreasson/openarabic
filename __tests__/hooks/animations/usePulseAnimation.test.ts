/**
 * Very basic tests for usePulseAnimation
 *
 * These tests only verify the hook's API surface, not the animation behavior.
 * The actual animation behavior is handled by the react-native-reanimated library,
 * which we're mocking here.
 */

import { renderHook } from '@testing-library/react-hooks';
import { usePulseAnimation } from '../../../hooks/animations';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn(val => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({ transform: [{ scale: 1 }] })),
    withTiming: jest.fn(val => val),
  };
});

describe('usePulseAnimation', () => {
  it('has the expected API surface', () => {
    const { result } = renderHook(() => usePulseAnimation());

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('pulse');
    expect(result.current).toHaveProperty('scale');
    expect(typeof result.current.pulse).toBe('function');
  });
});
