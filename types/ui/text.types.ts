import { TextProps, TextStyle, StyleProp } from 'react-native';

export type TextTypeName =
  | 'arabic'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'label'
  | 'link'
  | 'overline';

export type TextVariant =
  | 'error'
  | 'subtle'
  | 'success'
  | 'warning'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'disabled';

export type TextWeight =
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | '300'
  | '400'
  | '500'
  | '600'
  | number; // Allow numeric weights for flexibility

export type TextAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';

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
  colorName?: keyof typeof import('../../constants/Colors').Colors.light;
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
  /** The word object with details */
  word: {
    word_form: string;
    english?: string;
    id?: number;
    [key: string]: any;
  };
  /** Whether this word is selected */
  isSelected?: boolean;
  /** Function called when word is pressed */
  onPress: (word: any) => void;
  /** Scaling factor for the word size */
  scale?: number;
  /** Base size for the word display */
  baseSize?: number;
  /** Whether the word is interactive */
  interactive?: boolean;
  /** Whether a long press should show word info */
  showInfoOnLongPress?: boolean;
  /** Whether to highlight the word */
  highlighted?: boolean;
  /** Color when the word is highlighted */
  highlightColor?: string;
  /** Size of text (normal, large) */
  size?: 'normal' | 'large' | 'small';
  /** Custom font size */
  fontSize?: number;
  /** Custom line height */
  lineHeight?: number;
}
