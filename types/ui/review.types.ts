import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Props for the WordDisplay component
 */
export interface WordDisplayProps {
  /** The Arabic word to display */
  word: string;
  /** The font size for the word */
  fontSize?: number;
  /** Translation of the word */
  translation?: string;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Show only first letter as hesitation hint */
  showFirstLetterOnly?: boolean;
  /** English translation for hint (when showFirstLetterOnly is true) */
  englishTranslation?: string;
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
