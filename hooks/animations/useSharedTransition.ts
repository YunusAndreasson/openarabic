import { useCallback } from 'react';
import { SharedTransition } from 'react-native-reanimated';
import { SPRING_CONFIG } from './animationConfigs';

/**
 * Configuration options for shared transitions
 */
export interface SharedTransitionOptions {
  /**
   * Duration of the transition in milliseconds
   * @default 500
   */
  duration?: number;

  /**
   * Spring configuration for the transition
   */
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
    overshootClamping?: boolean;
  };
}

/**
 * Hook to create shared element transitions between screens
 *
 * @example
 * ```tsx
 * // In first screen
 * const { sharedTransitionTag } = useSharedTransition('image-1');
 *
 * return (
 *   <Animated.Image
 *     source={source}
 *     sharedTransitionTag={sharedTransitionTag}
 *   />
 * );
 *
 * // In second screen
 * const { sharedTransitionTag } = useSharedTransition('image-1');
 *
 * return (
 *   <Animated.Image
 *     source={source}
 *     sharedTransitionTag={sharedTransitionTag}
 *   />
 * );
 * ```
 *
 * @param id - Unique identifier for the shared element
 * @param options - Configuration options for the transition
 * @returns Object with shared transition configuration
 */
export const useSharedTransition = (id: string, options: SharedTransitionOptions = {}) => {
  const { duration = 500, springConfig = SPRING_CONFIG.CARD } = options;

  // Create the shared transition tag
  const sharedTransitionTag = id;

  // Create a basic shared transition
  // Note: The exact API may vary based on the Reanimated version
  // This is a simplified version that should work with most Reanimated 3.x versions
  const sharedTransition = SharedTransition.duration(duration);

  return {
    sharedTransitionTag,
    sharedTransition,
  };
};
