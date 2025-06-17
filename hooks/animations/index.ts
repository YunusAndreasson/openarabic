/**
 * Centralized exports for all animation hooks
 * This allows importing from a single location:
 * import { useOpacityAnimation, usePressAnimation } from '@/hooks/animations';
 */

// Export all animation hooks
export { useOpacityAnimation } from './useOpacityAnimation';
export { usePressAnimation } from './usePressAnimation';
export { useTransformAnimation } from './useTransformAnimation';
export { useProgressAnimation } from './useProgressAnimation';
export { useToggleAnimation } from './useToggleAnimation';

// Export animation configs
export { TIMING_CONFIG, SPRING_CONFIG } from '@/constants/animation';
