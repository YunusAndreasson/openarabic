import type { ViewStyle } from 'react-native';
import type { CSSStyle } from 'react-native-reanimated';

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

  const animatedStyle: CSSStyle<ViewStyle> = {
    transform: [{ scale }],
    transitionProperty: 'transform',
    transitionDuration: `${TIMING_CONFIG.MEDIUM.duration}ms`,
    transitionTimingFunction: 'ease-out',
  };

  return { animatedStyle };
}
