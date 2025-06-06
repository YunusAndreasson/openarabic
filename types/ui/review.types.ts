import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Props for the WordDisplay component
 */
export interface WordDisplayProps {
  /** The Arabic word to display */
  word: string;
  /** The font size for the word */
  fontSize?: number;
  /** Whether to show the meaning */
  showMeaning?: boolean;
  /** Translation of the word */
  translation?: string;
  /** Function called when the word is pressed */
  onPress?: () => void;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Size of the text */
  size?: 'large' | 'medium' | 'small';
  /** Arabic word to display (alternative to word prop) */
  arabicWord?: string;
}

/**
 * Props for the MeaningOverlay component
 */
export interface MeaningOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** The meaning to show (translation) */
  meaning: string;
  /** Whether this is a warning message */
  isWarning?: boolean;
  /** Whether this is a vague knowledge indicator */
  isVague?: boolean;
  /** Whether this indicates a struggling state */
  isStruggling?: boolean;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Whether to animate the overlay */
  animate?: boolean;
  /** Function to call when the overlay is closed */
  onClose?: () => void;
}

/**
 * Props for the InstructionFooter component
 */
export interface InstructionFooterProps {
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
}

/**
 * Props for the ErrorMessage component in vocabulary
 */
export interface ErrorMessageProps {
  /** Screen name to navigate to on retry */
  screenName?: string;
  /** Custom error message to display */
  customMessage?: string;
  /** Error message to display */
  message?: string;
  /** Function to retry the action */
  onRetry?: () => void;
}
