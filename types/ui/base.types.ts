import type { ViewStyle, StyleProp } from 'react-native';
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
 * Base props for components with optional press handlers
 */
export interface BaseOptionalPressableProps {
  /** Optional callback when the component is pressed */
  onPress?: () => void;
  /** Optional test identifier used for testing */
  testID?: string;
}

/**
 * Type to help with animated style casting
 */
export type AnimatedStyleProp<T> = AnimatedStyle<T> | StyleProp<T>;
