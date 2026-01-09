import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';

import { PRESS_SCALE, SPRING_CONFIG } from '@/constants/animation';
import { useTransformAnimation } from '@/hooks/animations';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

interface EditModeCardAnimationOptions {
  /** Whether the card is in edit mode (shows delete button, scales down) */
  editMode: boolean;
  /** Whether the card is currently being dragged (for draggable lists) */
  isBeingDragged?: boolean;
  /** Whether to animate on mount (for staggered list animations) */
  shouldAnimateOnMount?: boolean;
}

interface EditModeCardAnimationResult {
  /** Animated style to apply to the card container */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
}

/**
 * Hook for managing card edit mode animations.
 *
 * Consolidates the common pattern of scaling cards during:
 * - Edit mode (scales to PRESS_SCALE.MODERATE)
 * - Drag operations (scales to PRESS_SCALE.DRAG_UP)
 * - Mount animations (animates from initial to target scale)
 *
 * @example
 * ```tsx
 * const { animatedStyle } = useEditModeCardAnimation({
 *   editMode,
 *   isBeingDragged,
 *   shouldAnimateOnMount: true,
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
  shouldAnimateOnMount = false,
}: EditModeCardAnimationOptions): EditModeCardAnimationResult {
  const { animatedStyle, startAnimation, setValue } = useTransformAnimation({
    type: 'scale',
    initialValue: 1,
    targetValue: 1,
    useSpring: true,
    damping: SPRING_CONFIG.RESPONSIVE.damping,
    stiffness: SPRING_CONFIG.RESPONSIVE.stiffness,
  });

  useEffect(() => {
    if (isBeingDragged) {
      setValue(PRESS_SCALE.DRAG_UP);
    } else if (editMode) {
      setValue(PRESS_SCALE.MODERATE);
    } else if (shouldAnimateOnMount) {
      startAnimation();
    } else {
      // Ensure we are at the target value without triggering an animation
      setValue(1);
    }
  }, [editMode, isBeingDragged, shouldAnimateOnMount, startAnimation, setValue]);

  return { animatedStyle };
}
