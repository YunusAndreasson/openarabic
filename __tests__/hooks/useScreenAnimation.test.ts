import { renderHook, act } from '@testing-library/react-hooks';
import { useScreenAnimation } from '../../hooks/useScreenAnimation';

// Mock dependencies
const mockResetLayout = jest.fn();
const mockStartAnimation = jest.fn();
const mockTriggerAnimations = jest.fn();
const mockResetAnimations = jest.fn();

jest.mock('../../hooks/useLayoutReady', () => ({
  useLayoutReady: jest.fn(() => ({ isLayoutReady: true, resetLayout: mockResetLayout })),
}));

jest.mock('../../hooks/animations', () => ({
  useOpacityAnimation: jest.fn(() => ({
    animatedStyle: { opacity: 1 },
    startAnimation: mockStartAnimation,
    opacity: { value: 0 },
    entering: { duration: 300 },
    exiting: { duration: 300 },
  })),
}));

jest.mock('../../hooks/useAnimationTrigger', () => ({
  useAnimationTrigger: jest.fn(() => ({
    animationsTriggered: true,
    triggerAnimations: mockTriggerAnimations,
    resetAnimations: mockResetAnimations,
  })),
}));

describe('useScreenAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock implementations for each test
    require('../../hooks/useLayoutReady').useLayoutReady.mockImplementation(() => ({
      isLayoutReady: true,
      resetLayout: mockResetLayout,
    }));

    require('../../hooks/animations').useOpacityAnimation.mockImplementation(() => ({
      animatedStyle: { opacity: 1 },
      startAnimation: mockStartAnimation,
      opacity: { value: 0 },
      entering: { duration: 300 },
      exiting: { duration: 300 },
    }));

    require('../../hooks/useAnimationTrigger').useAnimationTrigger.mockImplementation(() => ({
      animationsTriggered: true,
      triggerAnimations: mockTriggerAnimations,
      resetAnimations: mockResetAnimations,
    }));
  });

  test('should combine hooks correctly', () => {
    const { result } = renderHook(() => useScreenAnimation(true));

    expect(result.current.isLayoutReady).toBe(true);
    expect(result.current.animationsTriggered).toBe(true);
    expect(result.current.fadeInStyle).toEqual({ opacity: 1 });
    expect(typeof result.current.triggerAnimations).toBe('function');
    expect(typeof result.current.resetAnimations).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  test('should pass correct parameters to child hooks', () => {
    const isDataReady = true;
    const isLoading = false;
    const animationDuration = 500;
    const layoutDelay = 100;
    const animationDelay = 200;

    renderHook(() =>
      useScreenAnimation(isDataReady, isLoading, animationDuration, layoutDelay, animationDelay)
    );

    // Check useLayoutReady was called with correct delay
    expect(require('../../hooks/useLayoutReady').useLayoutReady).toHaveBeenCalledWith(layoutDelay);

    // Check useOpacityAnimation was called with correct parameters
    expect(require('../../hooks/animations').useOpacityAnimation).toHaveBeenCalledWith({
      initialOpacity: 0,
      duration: animationDuration,
    });

    // Check useAnimationTrigger was called with correct parameters
    expect(require('../../hooks/useAnimationTrigger').useAnimationTrigger).toHaveBeenCalledWith(
      isDataReady,
      true, // isLayoutReady from mock
      isLoading,
      mockStartAnimation,
      animationDelay
    );
  });

  test('should calculate shouldRenderAnimatedContent correctly when animations triggered', () => {
    const { result } = renderHook(() => useScreenAnimation(true));

    expect(result.current.shouldRenderAnimatedContent).toBe(true);
  });

  test('should calculate shouldRenderAnimatedContent correctly when data ready but animations not triggered', () => {
    require('../../hooks/useAnimationTrigger').useAnimationTrigger.mockImplementation(() => ({
      animationsTriggered: false,
      triggerAnimations: mockTriggerAnimations,
      resetAnimations: mockResetAnimations,
    }));

    const { result } = renderHook(() => useScreenAnimation(true));

    expect(result.current.shouldRenderAnimatedContent).toBe(true);
  });

  test('should calculate shouldRenderAnimatedContent correctly when layout not ready', () => {
    require('../../hooks/useLayoutReady').useLayoutReady.mockImplementation(() => ({
      isLayoutReady: false,
      resetLayout: mockResetLayout,
    }));

    const { result } = renderHook(() => useScreenAnimation(true));

    expect(result.current.shouldRenderAnimatedContent).toBe(false);
  });

  test('should reset all animation states when reset is called', () => {
    const mockOpacityValue = { value: 1 };

    require('../../hooks/animations').useOpacityAnimation.mockImplementation(() => ({
      animatedStyle: { opacity: 1 },
      startAnimation: mockStartAnimation,
      opacity: mockOpacityValue,
      entering: { duration: 300 },
      exiting: { duration: 300 },
    }));

    const { result } = renderHook(() => useScreenAnimation(true));

    act(() => {
      result.current.reset();
    });

    expect(mockResetLayout).toHaveBeenCalled();
    expect(mockResetAnimations).toHaveBeenCalled();
    expect(mockOpacityValue.value).toBe(0);
  });

  test('should handle loading state correctly', () => {
    const isLoading = true;
    renderHook(() => useScreenAnimation(true, isLoading));

    expect(require('../../hooks/useAnimationTrigger').useAnimationTrigger).toHaveBeenCalledWith(
      true, // isDataReady
      true, // isLayoutReady
      isLoading,
      expect.any(Function),
      0 // default animationDelay
    );
  });
});
