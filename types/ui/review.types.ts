import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Props for the WordDisplay component
 */
export interface WordDisplayProps {
  /** The Arabic word to display */
  word: string;
  /** Translation of the word */
  translation?: string;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Callback when user taps the word (to replay audio) */
  onWordPress?: () => void;
}
