/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useFadeInAnimation, useButtonAnimation } from '@/hooks/animations';
 */

export { useFadeInAnimation } from './useFadeInAnimation';
export { useSlideAnimation } from './useSlideAnimation';
export { useButtonAnimation, springConfig } from './useButtonAnimation';
export { useCardAnimation } from './useCardAnimation';
export { usePulseAnimation } from './usePulseAnimation';
export { useComponentAnimation } from './useComponentAnimation';
