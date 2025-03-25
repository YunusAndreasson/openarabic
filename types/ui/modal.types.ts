import { ViewStyle, TextStyle } from 'react-native';
import { BaseChildrenProps } from './base.types';

/**
 * Props for the ThemedModal component
 */
export interface ThemedModalProps extends BaseChildrenProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Function to call when the modal is closed
   */
  onClose: () => void;
  /**
   * Optional title for the modal
   */
  title?: string;
  /**
   * Whether to use a blur effect for the backdrop
   * @default true
   */
  useBlur?: boolean;
  /**
   * Whether to show a close button
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * Whether to animate the modal
   * @default true
   */
  animated?: boolean;
  /**
   * Custom style for the modal content container
   */
  contentStyle?: ViewStyle;
  /**
   * Custom style for the modal title
   */
  titleStyle?: TextStyle;
  /**
   * Whether to close the modal when tapping the backdrop
   * @default true
   */
  closeOnBackdropPress?: boolean;
  /**
   * Whether to use haptic feedback when closing
   * @default true
   */
  useHaptics?: boolean;
  /**
   * Custom width for the modal (percentage of screen width)
   * @default 0.85
   */
  widthPercentage?: number;
  /**
   * Maximum width for the modal
   * @default 400
   */
  maxWidth?: number;
  /**
   * Animation duration in milliseconds
   * @default LAYOUT.ANIMATION.DURATION.NORMAL
   */
  animationDuration?: number;
  /**
   * Blur intensity for the backdrop
   * @default 80
   */
  blurIntensity?: number;
  /**
   * Animation type for the modal
   * @default 'fade'
   */
  animationType?: 'fade' | 'slide' | 'none';
  /**
   * Opacity of the modal overlay
   * @default 0.8
   */
  overlayOpacity?: number;
}

/**
 * Props for the WordTooltip component
 */
export interface WordTooltipProps {
  /** The Arabic word to display */
  word: string;
  /** The translation of the word */
  translation: string;
  /** The x position of the tooltip trigger (word) */
  x: number;
  /** The y position of the tooltip trigger (word) */
  y: number;
  /** The width of the tooltip trigger (word) */
  width: number;
  /** The height of the tooltip trigger (word) */
  height: number;
  /** Whether the tooltip is visible */
  visible: boolean;
  /** Function to close the tooltip */
  onClose: () => void;
  /** Whether the user knows this word */
  isKnown?: boolean;
  /** Function to mark the word as known/unknown */
  onToggleKnown?: () => void;
}
