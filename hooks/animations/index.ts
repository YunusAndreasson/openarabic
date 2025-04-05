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
// Export screen animations hooks
export { useScreenAnimations } from './useScreenAnimations';
// For backward compatibility, re-export useScreenAnimations as useScreenAnimation
export { useScreenAnimations as useScreenAnimation } from './useScreenAnimations';
export { useFloatingButtonAnimation } from './useFloatingButtonAnimation';
export { useToggleAnimation } from './useToggleAnimation';
// export { useTooltipAnimation } from './useTooltipAnimation';

// Export animation configs
export { TIMING_CONFIG, SPRING_CONFIG } from './animationConfigs';
