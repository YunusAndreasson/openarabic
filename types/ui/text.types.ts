import type { TextProps, TextStyle, StyleProp } from 'react-native';

import type { ColorName } from '@/constants/colors';

export type TextTypeName =
  | 'arabic'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'label'
  | 'overline';
export type TextVariant = 'error' | 'primary' | 'secondary';
export type TextWeight = 'bold' | 'medium' | 'normal' | 'semibold';
export type TextAlign = 'center' | 'justify' | 'left' | 'right';

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
  ellipsizeMode?: 'clip' | 'head' | 'middle' | 'tail';
  /** Font size for Arabic text */
  arabicFontSize?: number;
  /** Custom style to apply to the text */
  style?: StyleProp<TextStyle>;
  /** Text content to display */
  children?: React.ReactNode;
}
