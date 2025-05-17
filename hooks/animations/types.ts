/**
 * Centralized exports for animation types
 * This allows importing types from a single location:
 * import { SharedValue, AnimatedStyleProp } from '@/hooks/animations/types';
 */

import type {
  SharedValue as ReanimatedSharedValue,
  AnimatedStyle as ReanimatedAnimatedStyle,
} from 'react-native-reanimated';

export type { AnimatedStyleProp } from '@/types/ui/base.types';

// Re-export types
export type SharedValue<T> = ReanimatedSharedValue<T>;
export type AnimatedStyle<T> = ReanimatedAnimatedStyle<T>;
