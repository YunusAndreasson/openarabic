import { useCallback } from 'react';

import { PRESS_ANIMATION_DEFAULT, useDebounce, usePressAnimation } from '@/hooks/animations';
import type { PressAnimationOptions } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple } from '@/utils/layoutUtils';

export type HapticType = 'light' | 'selection' | 'none';

export interface UseButtonPressOptions {
  /**
   * Press handler callback
   */
  onPress: () => void;

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
   * Whether to use debouncing (useful for rapid clicks)
   */
  debounce?: boolean;

  /**
   * Debounce duration in ms
   */
  debounceDuration?: number;

  /**
   * Press animation options (passed to usePressAnimation)
   */
  animationOptions?: PressAnimationOptions;

  /**
   * Android ripple size variant
   */
  rippleSize?: 'small' | 'medium';
}

export interface UseButtonPressResult {
  /**
   * Combined press handler with haptic feedback and debouncing
   */
  handlePress: () => void;

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

  /**
   * Whether button is effectively disabled (original disabled + debounce state)
   */
  isDisabled: boolean;
}

/**
 * Shared button press behavior hook
 *
 * Consolidates common button patterns:
 * - Press animations with scale/opacity effects
 * - Haptic feedback (light, selection, or none)
 * - Debouncing to prevent rapid clicks
 * - Android ripple configuration
 *
 * @example
 * ```tsx
 * const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
 *   useButtonPress({
 *     onPress: handleDelete,
 *     hapticType: 'selection',
 *     debounce: true,
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
  debounce = false,
  debounceDuration = 300,
  animationOptions,
  rippleSize,
}: UseButtonPressOptions): UseButtonPressResult {
  const colors = useColors();

  // Press animation - use provided options or default preset
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation(
    animationOptions ?? PRESS_ANIMATION_DEFAULT,
  );

  // Create the press handler with haptic feedback
  const pressHandler = useCallback(() => {
    if (disabled) return;

    // Trigger appropriate haptic feedback
    if (hapticType === 'light') {
      lightFeedback();
    } else if (hapticType === 'selection') {
      selectionFeedback();
    }
    // 'none' - no haptic feedback

    onPress();
  }, [disabled, onPress, hapticType]);

  // Always call useDebounce hook (hooks must be called unconditionally)
  const [debouncedHandlePress, isDebouncing] = useDebounce(pressHandler, debounceDuration);

  // Use the appropriate handler based on debounce setting
  const finalHandler = debounce ? debouncedHandlePress : pressHandler;
  const isDisabled = disabled || (debounce && isDebouncing);

  // Android ripple configuration
  const rippleConfig = createAndroidRipple(colors, rippleSize);

  return {
    handlePress: finalHandler,
    animatedStyle,
    handlePressIn,
    handlePressOut,
    rippleConfig,
    isDisabled,
  };
}
