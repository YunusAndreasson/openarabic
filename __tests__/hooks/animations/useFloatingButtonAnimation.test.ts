import { renderHook, act } from '@testing-library/react-hooks';
import { useFloatingButtonAnimation } from '../../../hooks/animations/useFloatingButtonAnimation';

// Mock dependencies
jest.mock('react-native-reanimated', () => {
  const withTiming = jest.fn(toValue => toValue);

  return {
    useAnimatedStyle: jest.fn(() => ({
      transform: [{ translateX: 0 }],
      opacity: 1,
    })),
    withTiming,
    useSharedValue: jest.fn(initialValue => ({
      value: initialValue,
    })),
  };
});

// Mock the slide and opacity animation hooks
jest.mock('../../../hooks/animations/useSlideAnimation', () => ({
  useSlideAnimation: jest.fn(() => ({
    animatedStyle: { transform: [{ translateX: 0 }] },
    startAnimation: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock('../../../hooks/animations/useOpacityAnimation', () => ({
  useOpacityAnimation: jest.fn(() => ({
    opacity: { value: 1 },
  })),
}));

describe('useFloatingButtonAnimation', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected API surface', () => {
    const { result } = renderHook(() => useFloatingButtonAnimation(true));

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('combinedBackButtonStyle');
    expect(result.current).toHaveProperty('combinedBookmarkButtonStyle');

    // Check the types of the returned styles
    expect(typeof result.current.combinedBackButtonStyle).toBe('object');
    expect(typeof result.current.combinedBookmarkButtonStyle).toBe('object');
  });

  it('starts animations when isVisible is true', () => {
    const { result } = renderHook(() => useFloatingButtonAnimation(true));

    // Get the mocked hooks
    const { useSlideAnimation } = require('../../../hooks/animations/useSlideAnimation');
    const slideAnimationMock = useSlideAnimation.mock.results[0].value;

    // Check that the start animation functions were called
    expect(slideAnimationMock.startAnimation).toHaveBeenCalled();
    expect(slideAnimationMock.reset).not.toHaveBeenCalled();
  });

  it('resets animations when isVisible is false', () => {
    const { result } = renderHook(() => useFloatingButtonAnimation(false));

    // Get the mocked hooks
    const { useSlideAnimation } = require('../../../hooks/animations/useSlideAnimation');
    const slideAnimationMock = useSlideAnimation.mock.results[0].value;

    // Check that the reset functions were called
    expect(slideAnimationMock.reset).toHaveBeenCalled();
    expect(slideAnimationMock.startAnimation).not.toHaveBeenCalled();
  });

  it('updates opacity based on visibility', () => {
    // First render with visible = true
    const { result, rerender } = renderHook(props => useFloatingButtonAnimation(props.isVisible), {
      initialProps: { isVisible: true },
    });

    // Get the mocked withTiming function
    const withTiming = require('react-native-reanimated').withTiming;

    // Check that withTiming was called with opacity 1
    expect(withTiming).toHaveBeenCalledWith(1, expect.any(Object));

    // Reset mocks
    jest.clearAllMocks();

    // Rerender with visible = false
    rerender({ isVisible: false });

    // Check that withTiming was called with opacity 0
    expect(withTiming).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('combines styles correctly', () => {
    // Mock the animated styles
    const { useAnimatedStyle } = require('react-native-reanimated');

    // Set up mock return values
    useAnimatedStyle.mockReturnValueOnce({
      transform: [{ translateX: 10 }],
      opacity: 0.8,
    });

    useAnimatedStyle.mockReturnValueOnce({
      transform: [{ translateX: -10 }],
      opacity: 0.7,
    });

    // Render the hook
    const { result } = renderHook(() => useFloatingButtonAnimation(true));

    // Check that the combined styles have the expected properties
    expect(result.current.combinedBackButtonStyle).toEqual({
      transform: [{ translateX: 10 }],
      opacity: 0.8,
    });

    expect(result.current.combinedBookmarkButtonStyle).toEqual({
      transform: [{ translateX: -10 }],
      opacity: 0.7,
    });
  });

  it('responds to changes in visibility', () => {
    // First render with visible = true
    const { result, rerender } = renderHook(props => useFloatingButtonAnimation(props.isVisible), {
      initialProps: { isVisible: true },
    });

    // Get the mocked hooks
    const { useSlideAnimation } = require('../../../hooks/animations/useSlideAnimation');
    const initialSlideAnimationMock = useSlideAnimation.mock.results[0].value;

    // Check initial state
    expect(initialSlideAnimationMock.startAnimation).toHaveBeenCalled();
    expect(initialSlideAnimationMock.reset).not.toHaveBeenCalled();

    // Reset mocks
    jest.clearAllMocks();

    // Rerender with visible = false
    rerender({ isVisible: false });

    // Get the updated mocked hooks
    const updatedSlideAnimationMock = useSlideAnimation.mock.results[0].value;

    // Check that the animation functions were called correctly after update
    expect(updatedSlideAnimationMock.reset).toHaveBeenCalled();
    expect(updatedSlideAnimationMock.startAnimation).not.toHaveBeenCalled();
  });
});
