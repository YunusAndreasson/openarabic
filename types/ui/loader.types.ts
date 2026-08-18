import type { ViewStyle } from 'react-native';

/**
 * Props for the ProgressBar component
 */
export interface ProgressBarProps {
  /**
   * Progress value between 0 and 100
   */
  progress: number;
  /**
   * Height of the progress bar. Also sets the pill radius (height / 2).
   * @default LAYOUT.SPACING.MEDIUM
   */
  height?: number;
  /**
   * Duration of the animation in milliseconds
   * @default TIMING_CONFIG.PROGRESS.duration
   */
  animationDuration?: number;
  /**
   * Custom style for the progress bar container
   */
  style?: ViewStyle;
  /**
   * Custom style for the progress fill
   */
  fillStyle?: ViewStyle;
  /**
   * Custom track color for the progress bar.
   * If not provided, uses `colors.progressBackground`.
   */
  backgroundColor?: string;
  /**
   * Custom fill color for the progress bar.
   * If not provided, uses `colors.progressIndicator`.
   */
  fillColor?: string;
}
