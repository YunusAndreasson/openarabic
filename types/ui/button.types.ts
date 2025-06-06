import type { TouchableOpacityProps, ViewStyle, StyleProp } from 'react-native';

import type { AnimatedStyleProp, BaseAnimatedStyleProps } from './base.types';

/**
 * Button variant types
 */
export type ButtonVariant = 'filled' | 'outlined';

/**
 * Button size options
 */
export type ButtonSize = 'large' | 'medium' | 'small';

/**
 * Button text weight options
 */
export type ButtonTextWeight = 'bold' | 'normal';

/**
 * Base button props shared across all button variants
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
  size?: ButtonSize;
  /** Text weight for the button text */
  textWeight?: ButtonTextWeight;
  /** Whether to disable the press animation */
  disablePressAnimation?: boolean;
}

/**
 * Props for icon buttons (shared across variants)
 */
export interface IconButtonProps {
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
  /** Optional custom icon component (overrides icon prop if both are provided) */
  iconComponent?: React.ReactNode;
}

/**
 * Props for filled variant of ThemedButton
 */
export interface FilledButtonProps extends BaseButtonProps, IconButtonProps {
  /** Visual style variant of the button */
  variant: 'filled';
}

/**
 * Props for outlined variant of ThemedButton
 */
export interface OutlinedButtonProps extends BaseButtonProps, IconButtonProps {
  /** Visual style variant of the button */
  variant: 'outlined';
}

/**
 * A themed button component that supports different visual styles,
 * icons, loading states, and press animations.
 */
export type ThemedButtonProps =
  | FilledButtonProps
  | OutlinedButtonProps
  | (BaseButtonProps &
      IconButtonProps & {
        variant?: ButtonVariant;
      });

/**
 * Props for the CloseButton component
 */
export interface CloseButtonProps {
  /** Function to call when button is pressed */
  onPress: () => void;
  /** Size of the button container */
  size?: ButtonSize | number;
  /** Size of the close icon */
  iconSize?: ButtonSize | number;
  /** Color of the close icon */
  color?: string;
  /** Additional styles for the button */
  style?: StyleProp<ViewStyle>;
  /** Whether to trigger haptic feedback on press */
  hapticFeedback?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
}

/**
 * Position options for floating buttons
 */
export type FloatingButtonPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

/**
 * Button type options for floating buttons
 */
export type FloatingButtonType = 'back' | 'bookmark' | 'play';

/**
 * Props for the FloatingButton component
 */
export interface FloatingButtonProps {
  position: FloatingButtonPosition;
  buttonType?: FloatingButtonType;
  top?: number;
  iconName: string;
  accessibilityLabel: string;
  onPress: () => Promise<void> | void;
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
