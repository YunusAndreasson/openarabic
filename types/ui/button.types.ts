import type { TouchableOpacityProps, ViewStyle } from 'react-native';

import type { BaseAnimatedStyleProps } from './base.types';

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
 * Generic base props for icon-based buttons
 */
export interface BaseIconButtonProps<TIcon = string> {
  /** Icon name (string or union of icon names) */
  icon: TIcon;
  /** Icon size in pixels */
  size?: number;
  /** Icon color */
  color?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Press handler */
  onPress: () => void;
}
