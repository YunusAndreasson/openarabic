import { TouchableOpacityProps, ViewStyle } from 'react-native';
import { BaseAnimatedStyleProps } from './base.types';

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
  /** Function to call when close button is pressed */
  onPress: () => void;
  /** Size of the close button (small or large) */
  size?: 'small' | 'large';
  /** Color of the close icon */
  color?: string;
  /** Style applied to the container */
  style?: ViewStyle;
  /** Whether to use a circle background */
  useCircle?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * Props for the FloatingButton component
 */
export interface FloatingButtonProps {
  /** Function to call when button is pressed */
  onPress: () => void;
  /** Icon name from Ionicons */
  icon: string;
  /** Position of the button (bottom-right, bottom-left, etc.) */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Text to show next to the button */
  text?: string;
  /** Color of the button background */
  backgroundColor?: string;
  /** Color of the icon */
  iconColor?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}
