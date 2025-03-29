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
export { usePulseAnimation } from './usePulseAnimation';
export { usePressAnimation } from './usePressAnimation';
export { useTransformAnimation } from './useTransformAnimation';
export { useComponentAnimation } from './useComponentAnimation';
export { useAnimationTrigger } from './useAnimationTrigger';
export { useToggleAnimation } from './useToggleAnimation';
export { useGraphAnimation } from './useGraphAnimation';
export { useFloatingButtonAnimation } from './useFloatingButtonAnimation';
export { useProgressAnimation } from './useProgressAnimation';
export { useScreenAnimation } from './useScreenAnimation';
export { useScreenAnimations } from './useScreenAnimations';

// Export types
export type { PulseStyle, PulseAnimationOptions, PulseAnimationResult } from './usePulseAnimation';
export type { PressAnimationType } from './usePressAnimation';
export type { SharedValue } from './types';
export type { ScreenAnimationResult } from './useScreenAnimation';

// Export animation configs
export { TIMING_CONFIG, SPRING_CONFIG } from './animationConfigs';
