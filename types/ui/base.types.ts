import type { StyleProp, ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';

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
 * Comprehensive base props combining style, pressable, and loading functionality
 * This consolidates the most common UI component patterns to reduce interface extension
 */
export interface BaseComponentProps extends BaseStyleProps {
  /** Optional callback when the component is pressed */
  onPress?: () => void;
  /** Optional test identifier used for testing */
  testID?: string;
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Children to render inside the component */
  children?: React.ReactNode;
}

/**
 * Type to help with animated style casting
 */
export type AnimatedStyleProp<T> = AnimatedStyle<T> | StyleProp<T>;

/**
 * Reanimated v4 CSS keyframe animations use properties (animationName, animationDuration, etc.)
 * that aren't part of React Native's ViewStyle. This type enables clean casting at animation
 * definition sites instead of repeating `as unknown as ViewStyle`.
 */
export type ReanimatedCSSAnimationStyle = ViewStyle & Record<string, unknown>;
