/**
 * Centralized exports for animation types
 * This allows importing types from a single location:
 * import { SharedValue, AnimatedStyleProp } from '@/hooks/animations/types';
 */

import type {
  SharedValue as ReanimatedSharedValue,
  AnimatedStyleProp as ReanimatedAnimatedStyleProp,
  AnimatedStyle as ReanimatedAnimatedStyle,
} from 'react-native-reanimated';

// Re-export types
export type SharedValue<T> = ReanimatedSharedValue<T>;
export type AnimatedStyleProp<T> = ReanimatedAnimatedStyleProp<T>;
export type AnimatedStyle<T> = ReanimatedAnimatedStyle<T>;
