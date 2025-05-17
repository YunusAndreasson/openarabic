import type { ViewStyle } from 'react-native';

import type { BaseAnimatedStyleProps } from './base.types';

/**
 * Props for the ProgressBar component
 */
export interface ProgressBarProps extends BaseAnimatedStyleProps {
  /**
   * Progress value between 0 and 100
   */
  progress: number;
  /**
   * Height of the progress bar
   * @default LAYOUT.SPACING.SMALL
   */
  height?: number;
  /**
   * Custom style for the progress fill
   */
  fillStyle?: ViewStyle;
  /**
   * Custom background color for the progress bar
   * If not provided, uses theme-based color
   */
  backgroundColor?: string;
  /**
   * Custom fill color for the progress bar
   * If not provided, uses theme's tint color
   */
  fillColor?: string;
  /**
   * Whether to animate the progress bar
   * @default false
   */
  animationTriggered?: boolean;
  /**
   * Duration of the animation in milliseconds
   * @default 2000
   */
  animationDuration?: number;
}
