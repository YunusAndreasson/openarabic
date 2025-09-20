import { useCallback, useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import {
  interpolate,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  CARD_PRESS_OPACITY,
  PRESS_SCALE,
  SPRING_CONFIG,
  useAnimationConfig,
} from '@/constants/animation';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

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
  animatedStyle: AnimatedStyleProp<ViewStyle>;

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
  const { shouldAnimate, springConfig: reducedMotionSpring } = useAnimationConfig();

  // Set defaults based on type
  const defaultScaleAmount = type === 'card' ? PRESS_SCALE.CARD : PRESS_SCALE.BUTTON;
  const finalScaleAmount = scaleAmount ?? defaultScaleAmount;
  const finalOpacityAmount = opacityAmount ?? CARD_PRESS_OPACITY;
  const finalIncludeOpacity = includeOpacity ?? type === 'card';
  const finalSpringConfig = useRef(
    shouldAnimate
      ? springConfig ?? (type === 'card' ? SPRING_CONFIG.CARD : SPRING_CONFIG.BUTTON)
      : reducedMotionSpring ?? { damping: 100, stiffness: 1000, mass: 1 }
  ).current;

  // Animation value
  const pressed = useSharedValue(0);
  const isMountedRef = useRef(true);

  // Create animated style
  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet';
    const scale = interpolate(pressed.value, [0, 1], [1, finalScaleAmount], 'clamp');

    if (finalIncludeOpacity) {
      const opacity = interpolate(pressed.value, [0, 1], [1, finalOpacityAmount], 'clamp');
      return {
        transform: [{ scale }],
        opacity,
      };
    }

    return {
      transform: [{ scale }],
    };
  }, [
    pressed,
    finalScaleAmount,
    finalOpacityAmount,
    finalIncludeOpacity,
  ]) as AnimatedStyleProp<ViewStyle>;

  // Press handlers - optimized to run on UI thread
  const animatePressIn = useCallback(() => {
    'worklet';
    pressed.value = withSpring(1, finalSpringConfig);
  }, [pressed, finalSpringConfig]);

  const animatePressOut = useCallback(() => {
    'worklet';
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
    handlePressIn,
    handlePressOut,
  };
};
