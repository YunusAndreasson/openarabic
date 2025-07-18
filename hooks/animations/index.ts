/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useOpacityAnimation, usePressAnimation } from '@/hooks/animations';
 */

// Export all animation hooks
export { useOpacityAnimation } from './useOpacityAnimation';
export { usePressAnimation } from './usePressAnimation';
export { useTransformAnimation } from './useTransformAnimation';

export { useToggleAnimation } from './useToggleAnimation';

// Export animation configs
export { SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
