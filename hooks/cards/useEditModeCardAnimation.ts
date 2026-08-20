import type { ViewStyle } from 'react-native';
import type { CSSStyle } from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';

import { PRESS_SCALE, TIMING_CONFIG } from '@/constants/animation';

interface EditModeCardAnimationOptions {
  /** Whether the card is in edit mode (shows delete button, scales down) */
  editMode: boolean;
  /** Whether the card is currently being dragged (for draggable lists) */
  isBeingDragged?: boolean;
}

interface EditModeCardAnimationResult {
  /** CSS transition style to apply to the card container */
  animatedStyle: CSSStyle<ViewStyle>;
}

/**
 * Hook for managing card edit mode animations.
 *
 * Uses CSS transitions to declaratively scale cards based on:
 * - Edit mode (scales to PRESS_SCALE.MODERATE)
 * - Drag operations (scales to PRESS_SCALE.DRAG_UP)
 * - Default (scale 1)
 *
 * @example
 * ```tsx
 * const { animatedStyle } = useEditModeCardAnimation({
 *   editMode,
 *   isBeingDragged,
 * });
 *
 * return (
 *   <Animated.View style={[styles.container, animatedStyle]}>
 *     <CardContent />
 *   </Animated.View>
 * );
 * ```
 */
export function useEditModeCardAnimation({
  editMode,
  isBeingDragged = false,
}: EditModeCardAnimationOptions): EditModeCardAnimationResult {
  const scale = isBeingDragged ? PRESS_SCALE.DRAG_UP : editMode ? PRESS_SCALE.MODERATE : 1;

  /**
   * The card still changes size — it just stops travelling there.
   *
   * The scale is state, not decoration: it is how an editing or dragged card
   * says which one it is, so it has to survive Reduce Motion. What the setting
   * asks us to drop is the journey, so the transition goes and the card takes
   * its new size on the next frame.
   *
   * Explicit because Reanimated will not do it: `withTiming` and the layout
   * builders default to `ReduceMotion.System`, but the CSS API — which is what
   * `transitionProperty` is — has no reduced-motion handling at all in 4.5.
   */
  const reduceMotion = useReducedMotion();

  const animatedStyle: CSSStyle<ViewStyle> = reduceMotion
    ? { transform: [{ scale }] }
    : {
        transform: [{ scale }],
        transitionProperty: 'transform',
        transitionDuration: `${TIMING_CONFIG.MEDIUM.duration}ms`,
        transitionTimingFunction: 'ease-out',
      };

  return { animatedStyle };
}
