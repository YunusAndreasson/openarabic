/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useOpacityAnimation, usePressAnimation } from '@/hooks/animations';
 */

/**
 * MIGRATION GUIDE
 *
 * The following hooks have been consolidated into unified hooks:
 *
 * - useButtonAnimation → usePressAnimation({ type: 'button' })
 * - useCardAnimation → usePressAnimation({ type: 'card' })
 * - useFadeInAnimation → useOpacityAnimation({ initialOpacity: 0 })
 * - useFadeInEntrance → useOpacityAnimation({ style: 'entrance-only' })
 * - useDramaticPulseAnimation → usePulseAnimation({ style: 'dramatic' })
 */

// Backward compatibility aliases
import { useOpacityAnimation } from './useOpacityAnimation';
import { usePressAnimation } from './usePressAnimation';
import { usePulseAnimation } from './usePulseAnimation';

export { useOpacityAnimation } from './useOpacityAnimation';
export { useSlideAnimation } from './useSlideAnimation';
export { usePressAnimation } from './usePressAnimation';
export { usePulseAnimation } from './usePulseAnimation';
export { useComponentAnimation } from './useComponentAnimation';
export { useToggleAnimation } from './useToggleAnimation';
export { useScaleAnimation } from './useScaleAnimation';
export { useProgressAnimation } from './useProgressAnimation';
export { useFloatingButtonAnimation } from './useFloatingButtonAnimation';
export { useGraphAnimation } from './useGraphAnimation';
export { useAnimationTrigger } from './useAnimationTrigger';
export { useScreenAnimation } from './useScreenAnimation';

// Export standardized animation configurations
export { TIMING_CONFIG, SPRING_CONFIG } from './animationConfigs';

// Export animation types
export * from './types';

// Export type definitions from hooks
export type {
  FadeAnimationStyle,
  FadeAnimationOptions,
  FadeAnimationResult,
} from './useOpacityAnimation';
export type {
  PressAnimationType,
  PressAnimationOptions,
  PressAnimationResult,
} from './usePressAnimation';
export type { PulseStyle, PulseAnimationOptions, PulseAnimationResult } from './usePulseAnimation';
export type { AnimationTriggerResult } from './useAnimationTrigger';
export type { ScreenAnimationResult } from './useScreenAnimation';

// Create aliases for old hook names
export const useFadeInAnimation = (delay = 0, duration = 300) =>
  useOpacityAnimation({ initialOpacity: 0, delay, duration });

export const useFadeInEntrance = (delay = 0, duration = 300) =>
  useOpacityAnimation({ style: 'entrance-only', delay, duration });

export const useButtonAnimation = (scaleAmount?: number) =>
  usePressAnimation({ type: 'button', scaleAmount });

export const useCardAnimation = (scaleAmount?: number, opacityAmount?: number) =>
  usePressAnimation({ type: 'card', scaleAmount, opacityAmount });
