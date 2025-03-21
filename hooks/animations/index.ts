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
 * - useScaleAnimation → useTransformAnimation({ type: 'scale' })
 * - useSlideAnimation → useTransformAnimation({ type: 'slide' })
 */

// Export main hooks
export { useOpacityAnimation } from './useOpacityAnimation';
export { usePressAnimation } from './usePressAnimation';
export { usePulseAnimation } from './usePulseAnimation';
export { useComponentAnimation } from './useComponentAnimation';
export { useToggleAnimation } from './useToggleAnimation';
export { useProgressAnimation } from './useProgressAnimation';
export { useFloatingButtonAnimation } from './useFloatingButtonAnimation';
export { useGraphAnimation } from './useGraphAnimation';
export { useAnimationTrigger } from './useAnimationTrigger';
export { useScreenAnimation } from './useScreenAnimation';
export { useTransformAnimation } from './useTransformAnimation';

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
export type {
  TransformType,
  SlideDirection,
  TransformAnimationOptions,
  TransformAnimationResult,
} from './useTransformAnimation';
