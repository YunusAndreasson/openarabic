import { TextInputProps } from 'react-native';
import { BaseStyleProps } from './base.types';

/**
 * Props for the ThemedInput component
 */
export interface ThemedInputProps extends TextInputProps {
  /** Optional icon name to display on the left side */
  icon?: string;
  /** Optional icon name to display on the right side */
  rightIcon?: string;
  /** Callback when the right icon is pressed */
  onRightIconPress?: () => void;
  /** Error message to display below the input */
  error?: string;
  /** Hint text to display below the input */
  hint?: string;
}

/**
 * Props for the Toggle component
 */
export interface ToggleProps {
  /** Current state of the toggle (true = on, false = off) */
  value: boolean;
  /** Callback function when the toggle state changes */
  onValueChange: (value: boolean) => void;
  /** Optional label for the toggle */
  label?: string;
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
