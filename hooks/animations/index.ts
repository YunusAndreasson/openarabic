/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useOpacityAnimation, usePressAnimation } from '@/hooks/animations';
 */

// Export all animation hooks
export { useMotionStyle } from './useMotionStyle';
export { useOpacityAnimation } from './useOpacityAnimation';
export {
  PRESS_ANIMATION_BUTTON,
  PRESS_ANIMATION_DEFAULT,
  PRESS_ANIMATION_WIDE,
  usePressAnimation,
} from './usePressAnimation';
