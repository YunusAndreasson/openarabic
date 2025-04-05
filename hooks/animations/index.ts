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

// Export all animation hooks
export { useOpacityAnimation } from './useOpacityAnimation';
export { usePressAnimation } from './usePressAnimation';
export { usePulseAnimation } from './usePulseAnimation';
export { useTransformAnimation } from './useTransformAnimation';
export { useProgressAnimation } from './useProgressAnimation';
export { useComponentAnimation } from './useComponentAnimation';
export { useScreenAnimation } from './useScreenAnimation';
export { useToggleAnimation } from './useToggleAnimation';

// Export animation configs
export { TIMING_CONFIG, SPRING_CONFIG } from './animationConfigs';
