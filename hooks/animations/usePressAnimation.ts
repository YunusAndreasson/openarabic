import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  CARD_PRESS_OPACITY,
  PRESS_SCALE,
  SPRING_CONFIG,
  TIMING_CONFIG,
} from '@/constants/animation';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

export type PressAnimationType = 'button' | 'card' | 'custom';

// ===== STATIC PRESETS - Zero per-render allocations =====
// Use these instead of inline objects for optimal performance

/** Button press animation preset - scale only, responsive spring */
export const PRESS_ANIMATION_BUTTON = { type: 'button' } as const;

/** Card press animation preset - scale + opacity, gentler spring */
export const PRESS_ANIMATION_CARD = { type: 'card' } as const;

/**
 * Wide-control preset — a full-width or capsule CTA. Same spring, smaller
 * scale, so the absolute travel matches a narrower button's.
 */
export const PRESS_ANIMATION_WIDE = {
  type: 'button',
  scaleAmount: PRESS_SCALE.WIDE,
} as const;

/** Default/empty preset - uses button defaults */
export const PRESS_ANIMATION_DEFAULT = {} as const;

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
   * @default 0.96 for both button and card
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
 * Optimized for UI thread performance - spring animations run on UI thread
 * @param options - Configuration options for the press animation
 * @returns Animation controls and style for the pressable component
 */
export const usePressAnimation = (options: PressAnimationOptions = {}): PressAnimationResult => {
  const { type = 'button', scaleAmount, opacityAmount, includeOpacity, springConfig } = options;

  // Memoize config to prevent recalculation - stable across renders
  const config = useMemo(() => {
    const defaultScaleAmount = type === 'card' ? PRESS_SCALE.CARD : PRESS_SCALE.BUTTON;
    return {
      scaleAmount: scaleAmount ?? defaultScaleAmount,
      opacityAmount: opacityAmount ?? CARD_PRESS_OPACITY,
      includeOpacity: includeOpacity ?? type === 'card',
      springConfig: springConfig ?? (type === 'card' ? SPRING_CONFIG.CARD : SPRING_CONFIG.BUTTON),
    };
  }, [type, scaleAmount, opacityAmount, includeOpacity, springConfig]);

  // Animation shared value - runs on UI thread
  const pressed = useSharedValue(0);

  // Animated style - pure worklet, no JS thread dependencies
  // Note: shared values are auto-tracked by Reanimated, no need to include in deps
  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet';
    const scale = interpolate(pressed.get(), [0, 1], [1, config.scaleAmount], 'clamp');

    if (config.includeOpacity) {
      const opacity = interpolate(pressed.get(), [0, 1], [1, config.opacityAmount], 'clamp');
      return {
        transform: [{ scale }],
        opacity,
      };
    }

    return {
      transform: [{ scale }],
    };
  }) as AnimatedStyleProp<ViewStyle>;

  // Memoize handlers - shared value updates trigger UI thread animations
  //
  // Press-in and press-out deliberately use different curves.
  //
  // Press-in has a deadline: it has to be FINISHED while the finger is still
  // down, and a tap holds contact for 60-120ms. A spring can't meet that.
  // `SPRING_CONFIG.BUTTON` is ζ=0.71 with ω_d=10 rad/s, so its step response
  // first reaches the target at π/ω_d = 314ms — a 100ms tap travelled 49% of
  // the way, which turned a declared 0.96 press into an actual ~0.98. The app
  // has been shipping a press scale nobody ever saw. A 120ms ease-out lands
  // the pressed state under the finger, which is what makes a control read as
  // a key rather than as rubber.
  //
  // Press-out keeps the spring: the release has no deadline, and the settle is
  // where a spring earns its keep.
  const handlers = useMemo(
    () => ({
      handlePressIn: () => {
        pressed.set(withTiming(1, TIMING_CONFIG.FAST));
      },
      handlePressOut: () => {
        pressed.set(withSpring(0, config.springConfig));
      },
    }),
    [pressed, config.springConfig],
  );

  return {
    animatedStyle,
    handlePressIn: handlers.handlePressIn,
    handlePressOut: handlers.handlePressOut,
  };
};
