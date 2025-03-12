/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useFadeInAnimation, useButtonAnimation } from '@/hooks/animations';
 */

export { useFadeInAnimation } from './useFadeInAnimation';
export { useSlideAnimation } from './useSlideAnimation';
export { useButtonAnimation } from './useButtonAnimation';
export { useCardAnimation } from './useCardAnimation';
export { usePulseAnimation } from './usePulseAnimation';
export { useComponentAnimation } from './useComponentAnimation';
export { useShimmerAnimation } from './useShimmerAnimation';
export { useToggleAnimation } from './useToggleAnimation';
export { useScaleAnimation } from './useScaleAnimation';
export { useProgressAnimation } from './useProgressAnimation';
export { useSwipeAnimation } from './useSwipeAnimation';
export { useLayoutAnimation } from './useLayoutAnimation';
export { useSharedTransition } from './useSharedTransition';

// Export standardized animation configurations
export { TIMING_CONFIG, SPRING_CONFIG } from './animationConfigs';
