import { useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnUI,
  useWorkletCallback,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { SPRING_CONFIG } from './animationConfigs';
import type { SharedValue } from './types';

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
  springConfig?: WithSpringConfig;
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
 * Hook for press animations with scale and optional opacity effects
 * @param options - Configuration options for the press animation
 * @returns Animation controls and style for the pressable component
 */
export const usePressAnimation = (options: PressAnimationOptions = {}): PressAnimationResult => {
  const { type = 'button', scaleAmount, opacityAmount, includeOpacity, springConfig } = options;

  // Set defaults based on type
  const defaultScaleAmount = type === 'card' ? 0.985 : 0.97;
  const finalScaleAmount = scaleAmount ?? defaultScaleAmount;
  const finalOpacityAmount = opacityAmount ?? 0.97;
  const finalIncludeOpacity = includeOpacity ?? type === 'card';
  const finalSpringConfig = useRef(
    springConfig ?? (type === 'card' ? SPRING_CONFIG.CARD : SPRING_CONFIG.BUTTON)
  ).current;

  // Animation value
  const pressed = useSharedValue(0);
  const isMountedRef = useRef(true);

  // Create animated style
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const scale = interpolate(pressed.value, [0, 1], [1, finalScaleAmount], Extrapolate.CLAMP);

    if (finalIncludeOpacity) {
      const opacity = interpolate(
        pressed.value,
        [0, 1],
        [1, finalOpacityAmount],
        Extrapolate.CLAMP
      );
      return {
        transform: [{ scale }],
        opacity,
      };
    }

    return {
      transform: [{ scale }],
    };
  }, [pressed, finalScaleAmount, finalOpacityAmount, finalIncludeOpacity]);

  // Press handlers - optimized to run on UI thread
  const animatePressIn = useWorkletCallback(() => {
    pressed.value = withSpring(1, finalSpringConfig);
  }, [pressed, finalSpringConfig]);

  const animatePressOut = useWorkletCallback(() => {
    pressed.value = withSpring(0, finalSpringConfig);
  }, [pressed, finalSpringConfig]);

  const handlePressIn = useCallback(() => {
    if (isMountedRef.current) {
      runOnUI(animatePressIn)();
    }
  }, [animatePressIn]);

  const handlePressOut = useCallback(() => {
    if (isMountedRef.current) {
      runOnUI(animatePressOut)();
    }
  }, [animatePressOut]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    animatedStyle,
    pressed,
    handlePressIn,
    handlePressOut,
  };
};
