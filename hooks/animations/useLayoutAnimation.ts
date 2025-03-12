import { useCallback } from 'react';
import {
  LinearTransition,
  SequencedTransition,
  JumpingTransition,
  EntryExitTransition,
} from 'react-native-reanimated';
import { TIMING_CONFIG, SPRING_CONFIG } from './animationConfigs';

/**
 * Type of layout animation to use
 */
export type LayoutAnimationType = 'linear' | 'sequenced' | 'jumping' | 'entryExit';

/**
 * Configuration options for layout animations
 */
export interface LayoutAnimationOptions {
  /**
   * Type of layout animation to use
   * @default 'linear'
   */
  type?: LayoutAnimationType;

  /**
   * Duration for animations (ms)
   * @default TIMING_CONFIG.MEDIUM.duration
   */
  duration?: number;

  /**
   * Delay before animation starts (ms)
   * @default 0
   */
  delay?: number;

  /**
   * Whether to reverse the sequenced animation (only applies to sequenced type)
   * @default false
   */
  reverse?: boolean;
}

/**
 * Hook to create layout animations using Reanimated 3's latest Layout Transitions API
 *
 * @example
 * ```tsx
 * const { layout } = useLayoutAnimation();
 *
 * return (
 *   <Animated.View layout={layout}>
 *     {content}
 *   </Animated.View>
 * );
 * ```
 *
 * @param options - Configuration options for the layout animation
 * @returns Object with layout animation configuration
 */
export const useLayoutAnimation = (options: LayoutAnimationOptions = {}) => {
  const {
    type = 'linear',
    duration = TIMING_CONFIG.MEDIUM.duration,
    delay = 0,
    reverse = false,
  } = options;

  // Create the layout animation configuration based on the type
  const createLayout = useCallback(() => {
    switch (type) {
      case 'linear':
        return LinearTransition.duration(duration).delay(delay);

      case 'sequenced':
        // Apply reverse only if needed
        let transition = SequencedTransition.duration(duration).delay(delay);

        // Only apply reverse if true
        if (reverse) {
          transition = transition.reverse();
        }

        return transition;

      case 'jumping':
        return JumpingTransition.duration(duration).delay(delay);

      case 'entryExit':
        return EntryExitTransition.duration(duration).delay(delay);

      default:
        return LinearTransition.duration(duration).delay(delay);
    }
  }, [type, duration, delay, reverse]);

  // Get the layout configuration
  const layout = createLayout();

  return { layout };
};
