import type { PressableProps, ViewStyle } from 'react-native';

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
export interface BaseButtonProps extends Omit<PressableProps, 'style'>, BaseAnimatedStyleProps {
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
  /** Enable optimistic loading - immediately show loading when pressed */
  enableOptimisticLoading?: boolean;
  /** Whether to transform text to uppercase (default: true) */
  uppercase?: boolean;
}

/**
 * Props for icon buttons (shared across variants)
 */
export interface IconButtonProps {
  /** Optional Ionicons icon name to display before the title */
  icon?: string;
}

/**
 * Simplified ThemedButton props - variant is now optional with 'filled' as default
 */
export interface ThemedButtonProps extends BaseButtonProps, IconButtonProps {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
}

/**
 * Simplified base props for icon-based buttons
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
  /** Test ID for testing */
  testID?: string;
}
