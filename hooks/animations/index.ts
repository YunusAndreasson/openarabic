/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useOpacityAnimation, usePressAnimation } from '@/hooks/animations';
 */

// Export all animation hooks
export { useDebounce } from './useDebounce';
export { useOpacityAnimation } from './useOpacityAnimation';
export {
  PRESS_ANIMATION_BUTTON,
  PRESS_ANIMATION_CARD,
  PRESS_ANIMATION_DEFAULT,
  usePressAnimation,
} from './usePressAnimation';
export { useToggleAnimation } from './useToggleAnimation';

// Export animation configs
export { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
