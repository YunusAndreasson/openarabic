import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SPRING_CONFIG } from './animationConfigs';
import { SharedValue } from './types';
import { useCallback, useEffect, useRef } from 'react';
import { handleError } from '@/utils/errorHandling';

export type PressAnimationType = 'button' | 'card' | 'custom';

export interface PressAnimationOptions {
  /**
   * Type of press animation
   * - 'button': Standard button animation (faster spring, more scale)
   * - 'card': Card animation (gentler spring, less scale, with opacity)
   * - 'custom': Custom configuration
   * @default 'button'
   */
  type?: PressAnimationType;

  /**
   * Amount to scale down on press
   * @default 0.97 for button, 0.985 for card
   */
  scaleAmount?: number;

  /**
   * Amount to reduce opacity on press (only used for card or custom type)
   * @default 0.97 for card
   */
  opacityAmount?: number;

  /**
   * Whether to include opacity animation
   * @default false for button, true for card
   */
  includeOpacity?: boolean;

  /**
   * Custom spring configuration
   * @default SPRING_CONFIG.BUTTON or SPRING_CONFIG.CARD based on type
   */
  springConfig?: typeof SPRING_CONFIG.BUTTON;
}

export interface PressAnimationResult {
  /**
   * Animated style to apply to the component
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;

  /**
   * Shared value representing press state (0 = not pressed, 1 = pressed)
   */
  pressed: SharedValue<number>;

  /**
   * Function to call on press in
   */
  handlePressIn: () => void;

  /**
   * Function to call on press out
   */
  handlePressOut: () => void;
}

/**
 * Unified hook for press animations with scale and optional opacity effects
 * Combines functionality from useButtonAnimation and useCardAnimation
 *
 * @param options - Configuration options for the press animation
 * @returns Animation controls and style for the pressable component
 */
export const usePressAnimation = (options: PressAnimationOptions = {}): PressAnimationResult => {
  const { type = 'button', scaleAmount, opacityAmount, includeOpacity, springConfig } = options;
  const isMountedRef = useRef(true);

  // Set defaults based on type
  const defaultScaleAmount = type === 'card' ? 0.985 : 0.97;
  const defaultOpacityAmount = 0.97;
  const defaultIncludeOpacity = type === 'card';

  // Use provided values or defaults
  const finalScaleAmount = scaleAmount ?? defaultScaleAmount;
  const finalOpacityAmount = opacityAmount ?? defaultOpacityAmount;
  const finalIncludeOpacity = includeOpacity ?? defaultIncludeOpacity;

  // Select spring config based on type
  const finalSpringConfig =
    springConfig ?? (type === 'card' ? SPRING_CONFIG.CARD : SPRING_CONFIG.BUTTON);

  // Animation value
  const pressed = useSharedValue(0);

  // Track mounted state and cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      try {
        // Ensure we reset the animation on unmount to prevent memory issues
        pressed.value = 0;
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
      }
    };
  }, [pressed]);

  // Create animated style with or without opacity
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, finalScaleAmount], Extrapolation.CLAMP);

    if (finalIncludeOpacity) {
      const opacity = interpolate(
        pressed.value,
        [0, 1],
        [1, finalOpacityAmount],
        Extrapolation.CLAMP
      );
      return {
        transform: [{ scale }],
        opacity,
      };
    }

    return {
      transform: [{ scale }],
    };
  });

  // Press handlers
  const handlePressIn = useCallback(() => {
    'worklet';
    if (!isMountedRef.current) return;

    try {
      pressed.value = withSpring(1, finalSpringConfig);
    } catch (error) {
      handleError(error instanceof Error ? error : String(error));
      pressed.value = 1;
    }
  }, [pressed, finalSpringConfig]);

  const handlePressOut = useCallback(() => {
    'worklet';
    if (!isMountedRef.current) return;

    try {
      pressed.value = withSpring(0, finalSpringConfig);
    } catch (error) {
      handleError(error instanceof Error ? error : String(error));
      pressed.value = 0;
    }
  }, [pressed, finalSpringConfig]);

  return {
    animatedStyle,
    pressed,
    handlePressIn,
    handlePressOut,
  };
};
