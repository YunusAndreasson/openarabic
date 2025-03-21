/**
 * Compatibility layer for legacy animation hooks
 * This file provides backwards compatibility for code that still uses the
 * old animation hooks while also showing deprecation warnings.
 */

import { useOpacityAnimation } from './useOpacityAnimation';
import { usePressAnimation } from './usePressAnimation';
import { useTransformAnimation } from './useTransformAnimation';

/**
 * @deprecated Use useOpacityAnimation({ initialOpacity: 0, delay, duration }) instead
 */
export const useFadeInAnimation = (delay = 0, duration = 300) => {
  console.warn(
    'DEPRECATED: useFadeInAnimation is deprecated. Use useOpacityAnimation({ initialOpacity: 0, delay, duration }) instead.'
  );
  return useOpacityAnimation({ initialOpacity: 0, delay, duration });
};

/**
 * @deprecated Use useOpacityAnimation({ style: 'entrance-only', delay, duration }) instead
 */
export const useFadeInEntrance = (delay = 0, duration = 300) => {
  console.warn(
    'DEPRECATED: useFadeInEntrance is deprecated. Use useOpacityAnimation({ style: "entrance-only", delay, duration }) instead.'
  );
  return useOpacityAnimation({ style: 'entrance-only', delay, duration });
};

/**
 * @deprecated Use usePressAnimation({ type: 'button', scaleAmount }) instead
 */
export const useButtonAnimation = (scaleAmount?: number) => {
  console.warn(
    'DEPRECATED: useButtonAnimation is deprecated. Use usePressAnimation({ type: "button", scaleAmount }) instead.'
  );
  return usePressAnimation({ type: 'button', scaleAmount });
};

/**
 * @deprecated Use usePressAnimation({ type: 'card', scaleAmount, opacityAmount }) instead
 */
export const useCardAnimation = (scaleAmount?: number, opacityAmount?: number) => {
  console.warn(
    'DEPRECATED: useCardAnimation is deprecated. Use usePressAnimation({ type: "card", scaleAmount, opacityAmount }) instead.'
  );
  return usePressAnimation({ type: 'card', scaleAmount, opacityAmount });
};

/**
 * @deprecated Use useTransformAnimation({ type: 'scale', initialValue, targetValue, duration }) instead
 */
export const useScaleAnimation = (initialScale = 0.95, targetScale = 1, duration = 300) => {
  console.warn(
    'DEPRECATED: useScaleAnimation is deprecated. Use useTransformAnimation({ type: "scale", initialValue: initialScale, targetValue: targetScale, duration }) instead.'
  );
  return useTransformAnimation({
    type: 'scale',
    initialValue: initialScale,
    targetValue: targetScale,
    duration,
  });
};

/**
 * @deprecated Use useTransformAnimation({ type: 'slide', delay, damping, stiffness, direction }) instead
 */
export const useSlideAnimation = (
  delay = 0,
  damping?: number,
  stiffness?: number,
  direction: 'right' | 'left' = 'right'
) => {
  console.warn(
    'DEPRECATED: useSlideAnimation is deprecated. Use useTransformAnimation({ type: "slide", delay, damping, stiffness, direction }) instead.'
  );
  return useTransformAnimation({
    type: 'slide',
    delay,
    damping,
    stiffness,
    direction,
  });
};
