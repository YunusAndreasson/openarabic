import { renderHook } from '@testing-library/react-hooks';
import { useScreenAnimation } from '../../hooks/useScreenAnimation';

// Mock dependencies
jest.mock('../../hooks/useLayoutReady', () => ({
  useLayoutReady: jest.fn(() => ({ isLayoutReady: true, resetLayout: jest.fn() })),
}));

jest.mock('../../hooks/animations', () => ({
  useFadeInAnimation: jest.fn(() => ({
    animatedStyle: { opacity: 1 },
    startAnimation: jest.fn(),
    opacity: { value: 0 },
  })),
}));

jest.mock('../../hooks/useAnimationTrigger', () => ({
  useAnimationTrigger: jest.fn(() => ({
    animationsTriggered: true,
    triggerAnimations: jest.fn(),
    resetAnimations: jest.fn(),
  })),
}));

describe('useScreenAnimation', () => {
  test('should combine hooks correctly', () => {
    const { result } = renderHook(() => useScreenAnimation(true));

    expect(result.current.isLayoutReady).toBe(true);
    expect(result.current.animationsTriggered).toBe(true);
  });
});
