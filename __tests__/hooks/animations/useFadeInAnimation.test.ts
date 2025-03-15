/**
 * Tests for useFadeInAnimation
 *
 * NOTE: useFadeInAnimation is now an alias for useOpacityAnimation with specific parameters.
 * These tests verify the alias works as expected.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useFadeInAnimation, useOpacityAnimation } from '../../../hooks/animations';

// Mock useOpacityAnimation since useFadeInAnimation is now an alias
jest.mock('../../../hooks/animations/useOpacityAnimation', () => {
  const mockOpacityValue = { value: 0 };

  return {
    useOpacityAnimation: jest.fn(options => {
      // Set the initial opacity based on options
      if (options?.initialOpacity !== undefined) {
        mockOpacityValue.value = options.initialOpacity;
      } else {
        mockOpacityValue.value = 0;
      }

      return {
        opacity: mockOpacityValue,
        animatedStyle: { opacity: mockOpacityValue.value },
        startAnimation: jest.fn((targetOpacity = 1, callback) => {
          mockOpacityValue.value = targetOpacity;
          if (callback) callback();
        }),
        reverseAnimation: jest.fn((targetOpacity = 0, callback) => {
          mockOpacityValue.value = targetOpacity;
          if (callback) callback();
        }),
        resetAnimation: jest.fn(),
        stopAnimation: jest.fn(),
        entering: {},
        exiting: {},
      };
    }),
  };
});

describe('useFadeInAnimation', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('has the expected API surface', () => {
    const { result } = renderHook(() => useFadeInAnimation());

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('startAnimation');
    expect(typeof result.current.startAnimation).toBe('function');
    expect(result.current).toHaveProperty('reverseAnimation');
    expect(typeof result.current.reverseAnimation).toBe('function');
    expect(result.current).toHaveProperty('opacity');
    expect(result.current).toHaveProperty('entering');
    expect(result.current).toHaveProperty('exiting');
  });

  it('calls useOpacityAnimation with the correct parameters', () => {
    const delay = 100;
    const duration = 400;

    renderHook(() => useFadeInAnimation(delay, duration));

    // Verify useOpacityAnimation was called with the correct parameters
    expect(useOpacityAnimation).toHaveBeenCalledWith({
      initialOpacity: 0,
      delay,
      duration,
    });
  });

  it('uses default parameters correctly', () => {
    renderHook(() => useFadeInAnimation());

    // Verify useOpacityAnimation was called with default parameters
    expect(useOpacityAnimation).toHaveBeenCalledWith({
      initialOpacity: 0,
      delay: 0,
      duration: 300,
    });
  });
});
