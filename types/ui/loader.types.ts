import type { ViewStyle } from 'react-native';

import type { BaseAnimatedStyleProps } from './base.types';

/**
 * Props for the Loader component
 */
export interface LoaderProps extends BaseAnimatedStyleProps {
  /** Size of the loader - small, large, medium or a specific number */
  size?: number | 'small' | 'medium' | 'large';
  /** Color of the loader (defaults to text color) */
  color?: string;
}

/**
 * Props for a full-screen loading component
 */
export interface LoadingScreenProps {
  /** Color of the loader (defaults to tint color) */
  color?: string;
  /** Optional style to customize the screen container */
  style?: ViewStyle;
}

/**
 * Props for the LoadingContainer component
 */
export interface LoadingContainerProps extends BaseAnimatedStyleProps {
  /** Size of the loader - small, medium or large */
  size?: 'small' | 'medium' | 'large';
  /** Color of the loader */
  color?: string;
  /** Additional styles for the container */
  containerStyle?: ViewStyle;
}

/**
 * Props for the app-wide loader component
 */
export interface AppLoaderProps {
  /** Color of the loader (defaults to tint color) */
  color?: string;
}

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
