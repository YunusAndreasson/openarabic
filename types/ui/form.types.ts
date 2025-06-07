import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { TextInputProps, GestureResponderEvent } from 'react-native';

import type { BaseStyleProps } from './base.types';

/**
 * Props for the ThemedInput component
 */
export interface ThemedInputProps extends TextInputProps {
  /** Optional icon name to display on the left side */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Optional icon name to display on the right side */
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  /** Callback when the right icon is pressed */
  onRightIconPress?: (e: GestureResponderEvent) => void;
  /** Error message to display below the input */
  error?: string;
  /** Hint text to display below the input */
  hint?: string;
  /** Style for the input component */
  style?: TextInputProps['style'];
}

/**
 * Props for the Toggle component
 */
export interface ToggleProps {
  /** Current state of the toggle (true = on, false = off) */
  value: boolean;
  /** Callback function when the toggle state changes */
  onValueChange: (value: boolean) => void;
}

/**
 * Props for the CustomSlider component
 */
export interface CustomSliderProps extends BaseStyleProps {
  /**
   * Current value of the slider
   */
  value: number;

  /**
   * Callback when the value changes
   */
  onValueChange: (value: number) => void;

  /**
   * Minimum possible value
   * @default 0
   */
  minimumValue?: number;

  /**
   * Maximum possible value
   * @default 1
   */
  maximumValue?: number;

  /**
   * Step size for value changes
   * @default 0.1
   */
  step?: number;
}
