import { renderHook, act } from '@testing-library/react-hooks';
import {
  useOpacityAnimation,
  usePressAnimation,
  useTransformAnimation,
} from '../../../hooks/animations';

describe('Animation Hooks Tests', () => {
  // Test useOpacityAnimation
  describe('useOpacityAnimation', () => {
    it('should initialize with the correct opacity value', () => {
      const { result } = renderHook(() => useOpacityAnimation({ initialOpacity: 0 }));
      expect(result.current.opacity.value).toBe(0);
    });

    it('should handle fade-in animation', () => {
      const { result } = renderHook(() =>
        useOpacityAnimation({ initialOpacity: 0, duration: 100 })
      );

      act(() => {
        result.current.fadeIn();
      });

      // Note: We can't test actual animation in jest,
      // but we can check that the function exists and doesn't throw
      expect(result.current.fadeIn).toBeDefined();
    });

    it('should support all animation options', () => {
      const { result } = renderHook(() =>
        useOpacityAnimation({
          initialOpacity: 0.5,
          duration: 200,
          delay: 100,
          style: 'entrance-only',
        })
      );

      expect(result.current.opacity.value).toBe(0.5);
      expect(result.current.entering).toBeDefined();
      expect(result.current.exiting).toBeDefined();
    });
  });

  // Test usePressAnimation
  describe('usePressAnimation', () => {
    it('should initialize with the button type correctly', () => {
      const { result } = renderHook(() => usePressAnimation({ type: 'button' }));

      expect(result.current.pressed.value).toBe(0);
      expect(result.current.handlePressIn).toBeDefined();
      expect(result.current.handlePressOut).toBeDefined();
    });

    it('should initialize with the card type correctly', () => {
      const { result } = renderHook(() => usePressAnimation({ type: 'card' }));

      expect(result.current.pressed.value).toBe(0);
    });

    it('should support custom configuration', () => {
      const { result } = renderHook(() =>
        usePressAnimation({
          type: 'custom',
          scaleAmount: 0.9,
          opacityAmount: 0.8,
          includeOpacity: true,
        })
      );

      expect(result.current.animatedStyle).toBeDefined();
    });
  });

  // Test useTransformAnimation
  describe('useTransformAnimation', () => {
    it('should initialize scale animation correctly', () => {
      const { result } = renderHook(() =>
        useTransformAnimation({
          type: 'scale',
          initialValue: 0.95,
          targetValue: 1,
          duration: 200,
        })
      );

      expect(result.current.value.value).toBe(0.95);
      expect(result.current.transformType).toBe('scale');
    });

    it('should initialize slide animation correctly', () => {
      const { result } = renderHook(() =>
        useTransformAnimation({
          type: 'slide',
          direction: 'right',
          useSpring: true,
        })
      );

      expect(result.current.transformType).toBe('slide');
      expect(result.current.entering).toBeDefined();
      expect(result.current.exiting).toBeDefined();
    });

    it('should handle animation start and reset', () => {
      const { result } = renderHook(() =>
        useTransformAnimation({
          type: 'scale',
          initialValue: 0.5,
          targetValue: 1,
        })
      );

      act(() => {
        result.current.startAnimation();
      });

      act(() => {
        result.current.reset();
      });

      // Since we can't test actual animation, we just verify the methods exist
      expect(result.current.startAnimation).toBeDefined();
      expect(result.current.reset).toBeDefined();
    });
  });
});
