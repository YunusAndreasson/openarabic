import { TouchableOpacityProps, ViewStyle, StyleProp } from 'react-native';
import { BaseAnimatedStyleProps } from './base.types';
import { AnimatedStyleProp } from 'react-native-reanimated';

/**
 * Button variant types
 */
export type ButtonVariant = 'filled' | 'outlined';

/**
 * Base button props
 */
export interface BaseButtonProps
  extends Omit<TouchableOpacityProps, 'style'>,
    BaseAnimatedStyleProps {
  /** Text displayed on the button */
  title: string;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Size of the icon in pixels */
  iconSize?: number;
  /** Optional style to apply to the content container */
  contentContainerStyle?: ViewStyle;
  /** Optional style to apply to the inner container */
  innerContainerStyle?: ViewStyle;
  /** Optional custom scale amount for the press animation (default is 0.95) */
  scaleAmount?: number;
  /** Additional content to render inside the button */
  children?: React.ReactNode;
  /** Size variant of the button */
  size?: 'small' | 'medium' | 'large';
  /** Text weight for the button text */
  textWeight?: 'normal' | 'bold';
}

/**
 * Props for filled variant of ThemedButton
 */
export interface FilledButtonProps extends BaseButtonProps {
  /** Visual style variant of the button */
  variant: 'filled';
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
  /** Optional custom icon component (overrides icon prop if both are provided) */
  iconComponent?: React.ReactNode;
}

/**
 * Props for outlined variant of ThemedButton
 */
export interface OutlinedButtonProps extends BaseButtonProps {
  /** Visual style variant of the button */
  variant: 'outlined';
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
  /** Optional custom icon component (overrides icon prop if both are provided) */
  iconComponent?: React.ReactNode;
}

/**
 * A themed button component that supports different visual styles,
 * icons, loading states, and press animations.
 */
export type ThemedButtonProps =
  | FilledButtonProps
  | OutlinedButtonProps
  | (BaseButtonProps & {
      variant?: ButtonVariant;
      /** Optional Ionicons icon name to display before the title */
      icon?: string;
      /** Optional custom icon component (overrides icon prop if both are provided) */
      iconComponent?: React.ReactNode;
    });

/**
 * Props for the CloseButton component
 */
export interface CloseButtonProps {
  /** Function to call when button is pressed */
  onPress: () => void;
  /** Size of the button container */
  size?: number | 'small' | 'large';
  /** Size of the close icon */
  iconSize?: number | 'small' | 'large';
  /** Color of the close icon */
  color?: string;
  /** Additional styles for the button */
  style?: StyleProp<ViewStyle>;
  /** Whether to trigger haptic feedback on press */
  hapticFeedback?: boolean;
}

/**
 * Props for the FloatingButton component
 */
export interface FloatingButtonProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  buttonType?: 'back' | 'bookmark' | 'play';
  top?: number;
  iconName: string;
  accessibilityLabel: string;
  onPress: () => void | Promise<void>;
  colors: {
    background: string;
    text: string;
    primary?: string;
    [key: string]: string | undefined;
  };
  isDarkMode: boolean;
  isBookmarked?: boolean;
  animatedStyle?: AnimatedStyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}
