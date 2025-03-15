/**
 * Centralized exports for animation types
 * This allows importing types from a single location:
 * import { SharedValue, AnimatedStyleProp } from '@/hooks/animations/types';
 */

import type {
  SharedValue as ReanimatedSharedValue,
  AnimatedStyleProp as ReanimatedAnimatedStyleProp,
  AnimatedStyle as ReanimatedAnimatedStyle,
  WithTimingConfig,
  WithSpringConfig,
  EasingFunction,
  AnimatableValue,
  Animation,
  AnimationCallback,
  EntryExitAnimationFunction,
  LayoutAnimationFunction,
} from 'react-native-reanimated';

// Re-export types
export type SharedValue<T> = ReanimatedSharedValue<T>;
export type AnimatedStyleProp<T> = ReanimatedAnimatedStyleProp<T>;
export type AnimatedStyle<T> = ReanimatedAnimatedStyle<T>;

// Animation configuration types
export type TimingConfig = WithTimingConfig;
export type SpringConfig = WithSpringConfig;
export type Easing = EasingFunction;
export type AnimValue = AnimatableValue;
export type AnimationFunction = Animation<any>;
export type CompletionCallback = AnimationCallback;
export type EntryAnimation = EntryExitAnimationFunction;
export type LayoutAnimation = LayoutAnimationFunction;
