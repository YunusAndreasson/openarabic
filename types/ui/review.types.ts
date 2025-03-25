import { StyleProp, ViewStyle } from 'react-native';

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
  size?: 'small' | 'medium' | 'large';
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
  /** Translation of the word (alternative to meaning) */
  translation?: string;
  /** Function to close the overlay */
  onClose?: () => void;
  /** Display duration in milliseconds */
  duration?: number;
  /** Whether to animate the overlay */
  animate?: boolean;
}

/**
 * Props for the InstructionFooter component
 */
export interface InstructionFooterProps {
  /** Primary instruction text */
  primaryText: string;
  /** Secondary instruction text */
  secondaryText?: string;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
  /** Whether to animate the instructions */
  animate?: boolean;
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
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
}
