import { useCallback } from 'react';
import type { GestureResponderEvent } from 'react-native';

import { PRESS_ANIMATION_DEFAULT, usePressAnimation } from '@/hooks/animations';
import type { PressAnimationOptions } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { usePressLock } from '@/hooks/ui/usePressLock';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple } from '@/utils/layoutUtils';

export type HapticType = 'light' | 'selection' | 'none';

export interface UseButtonPressOptions {
  /**
   * Press handler callback. The gesture event is forwarded, so callers that
   * need it (ThemedButton passes it straight through to consumers) get it and
   * callers that don't can keep a zero-arg handler.
   */
  onPress?: (event?: GestureResponderEvent) => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Type of haptic feedback
   * - 'light': Light haptic feedback (play buttons)
   * - 'selection': Selection haptic feedback (delete/action buttons)
   * - 'none': No haptic feedback
   */
  hapticType?: HapticType;

  /**
   * Press animation options (passed to usePressAnimation)
   */
  animationOptions?: PressAnimationOptions;

  /**
   * Android ripple size variant
   */
  rippleSize?: 'small' | 'medium';

  /**
   * Draw the Android ripple above the content instead of behind it. Needed by
   * surfaces that paint their own opaque background (cards).
   */
  rippleForeground?: boolean;
}

export interface UseButtonPressResult {
  /**
   * Combined press handler: disabled check, repeat-press lock, haptic, `onPress`.
   */
  handlePress: (event?: GestureResponderEvent) => void;

  /**
   * Animation styles for the button
   */
  animatedStyle: ReturnType<typeof usePressAnimation>['animatedStyle'];

  /**
   * Press in handler for animation
   */
  handlePressIn: () => void;

  /**
   * Press out handler for animation
   */
  handlePressOut: () => void;

  /**
   * Android ripple configuration
   */
  rippleConfig: ReturnType<typeof createAndroidRipple>;
}

/**
 * Shared button press behavior hook
 *
 * Consolidates common button patterns:
 * - Press animations with scale/opacity effects
 * - Haptic feedback (light, selection, or none)
 * - A repeat-press lock, always on — see `usePressLock`
 * - Android ripple configuration
 *
 * The lock is not optional. It used to be, and exactly one component opted in,
 * so every other button was left to whatever guard its caller happened to wire
 * up — which produced four incompatible strategies and several buttons with
 * none at all. Nothing in this app wants two presses within 300ms to both land.
 *
 * @example
 * ```tsx
 * const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
 *   useButtonPress({
 *     onPress: handleDelete,
 *     hapticType: 'selection',
 *   });
 *
 * <Pressable
 *   onPress={handlePress}
 *   onPressIn={handlePressIn}
 *   onPressOut={handlePressOut}
 *   android_ripple={rippleConfig}
 * >
 *   <Animated.View style={animatedStyle}>
 *     {content}
 *   </Animated.View>
 * </Pressable>
 * ```
 */
export function useButtonPress({
  onPress,
  disabled = false,
  hapticType = 'none',
  animationOptions,
  rippleSize,
  rippleForeground = false,
}: UseButtonPressOptions): UseButtonPressResult {
  const colors = useColors();

  // Press animation - use provided options or default preset
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation(
    animationOptions ?? PRESS_ANIMATION_DEFAULT,
  );

  // Haptic then callback, behind the repeat-press lock.
  const lockedPress = usePressLock((event?: GestureResponderEvent) => {
    if (hapticType === 'light') {
      lightFeedback();
    } else if (hapticType === 'selection') {
      selectionFeedback();
    }
    // 'none' - no haptic feedback

    onPress?.(event);
  });

  // The disabled check sits OUTSIDE the lock: a press on a disabled control
  // should fire nothing and also arm nothing, so the control is live the
  // instant it re-enables rather than sitting in a lock it never earned.
  const handlePress = useCallback(
    (event?: GestureResponderEvent) => {
      if (disabled) return;
      lockedPress(event);
    },
    [disabled, lockedPress],
  );

  // Android ripple configuration
  const rippleConfig = createAndroidRipple(colors, rippleSize, rippleForeground);

  return {
    handlePress,
    animatedStyle,
    handlePressIn,
    handlePressOut,
    rippleConfig,
  };
}
