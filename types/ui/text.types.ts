import type { TextProps, TextStyle, StyleProp } from 'react-native';

import type { ColorName } from '../../constants/Colors';
import type { SentenceWord } from '../vocabulary.types';

export type TextTypeName =
  | 'body'
  | 'bodyBold'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'caption'
  | 'label'
  | 'arabic'
  | 'overline';
export type TextVariant =
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'disabled';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Props for the ThemedText component
 */
export interface ThemedTextProps extends TextProps {
  /** Type of text (heading, body, etc.) */
  type?: TextTypeName;
  /** Variant of text (error, subtle, etc.) */
  variant?: TextVariant;
  /** Weight of the text */
  weight?: TextWeight;
  /** Alignment of the text */
  align?: TextAlign;
  /** Custom color to apply to text - use theme colors when possible */
  colorName?: ColorName;
  /** Skip applying the default text color */
  skipDefaultColor?: boolean;
  /** Maximum number of lines to show */
  numberOfLines?: number;
  /** How text should be truncated if it overflows */
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  /** Font size for Arabic text */
  arabicFontSize?: number;
  /** Custom style to apply to the text */
  style?: StyleProp<TextStyle>;
  /** Text content to display */
  children?: React.ReactNode;
}

/**
 * Props for the ArabicWord component
 */
export interface ArabicWordProps {
  word: SentenceWord;
  isSelected?: boolean;
  onPress: (word: SentenceWord) => void;
  scale?: number;
  baseSize?: number;
  interactive?: boolean;
  showInfoOnLongPress?: boolean;
  highlighted?: boolean;
  highlightColor?: string;
  size?: 'normal' | 'large' | 'small';
  fontSize?: number;
  lineHeight?: number;
  style?: StyleProp<TextStyle>;
}
