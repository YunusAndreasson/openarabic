import type { ViewStyle, StyleProp, TextStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';

import type { useColors } from '@/hooks/theme/useColors';

/**
 * Base props for components with style
 */
export interface BaseStyleProps {
  /** Optional style to apply to the component */
  style?: StyleProp<ViewStyle>;
}

/**
 * Base props for components with animated style
 */
export interface BaseAnimatedStyleProps {
  /** Optional style to apply to the component, supporting animated styles */
  style?: AnimatedStyle<ViewStyle> | StyleProp<ViewStyle>;
}

/**
 * Base props for components with theme colors
 */
export interface BaseThemedProps {
  /** Theme colors for styling */
  colors: ReturnType<typeof useColors>;
}

/**
 * Base props for components with press handlers
 */
export interface BasePressableProps {
  /** Callback when the component is pressed */
  onPress: () => void;
}

/**
 * Base props for components with optional press handlers
 */
export interface BaseOptionalPressableProps {
  /** Optional callback when the component is pressed */
  onPress?: () => void;
}

/**
 * Base props for components with children
 */
export interface BaseChildrenProps {
  /** Children to render inside the component */
  children: React.ReactNode;
}

/**
 * Base props for components with animation properties
 */
export interface BaseAnimationProps {
  /** Delay before starting the animation (in ms) */
  delay?: number;
  /** Duration of the animation (in ms) */
  duration?: number;
}


/**
 * Type to help with animated style casting
 */
export type AnimatedStyleProp<T> = AnimatedStyle<T> | StyleProp<T>;
