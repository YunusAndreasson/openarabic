import type { TextProps, TextStyle, StyleProp } from 'react-native';

import type { SolidColorName } from '@/constants/colors';

export type TextTypeName =
  | 'arabic'
  /** Arabic sized for a dense index row — capped size, single-line box */
  | 'arabicCompact'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'label'
  | 'overline';
/**
 * Font weight override.
 *
 * There is no `medium`: only Inter Regular, SemiBold and Bold ship (see
 * `assets/fonts/`), so `medium` mapped to Regular — the same face as `normal`.
 * Two names for one weight meant `weight="medium"` silently did nothing at the
 * ten call sites that asked for it.
 *
 * Prefer picking a `type` that already carries the weight (`bodyBold`,
 * `heading3`) over overriding it here.
 */
type TextWeight = 'bold' | 'normal' | 'semibold';
export type TextAlign = 'center' | 'justify' | 'left' | 'right';

/**
 * Props for the ThemedText component
 */
export interface ThemedTextProps extends TextProps {
  /** Type of text (heading, body, etc.) */
  type?: TextTypeName;
  /** Weight of the text */
  weight?: TextWeight;
  /** Alignment of the text */
  align?: TextAlign;
  /**
   * Semantic colour for the text.
   *
   * This replaced a parallel `variant` prop (`'error' | 'primary' |
   * 'secondary'`) that mapped onto `error` / `text` / `secondaryText` — two
   * props for one job, with `colorName` already used three times as often.
   */
  colorName?: SolidColorName;
  /** Skip applying the default text color */
  skipDefaultColor?: boolean;
  /** Maximum number of lines to show */
  numberOfLines?: number;
  /** How text should be truncated if it overflows */
  ellipsizeMode?: 'clip' | 'head' | 'middle' | 'tail';
  /** Custom style to apply to the text */
  style?: StyleProp<TextStyle>;
  /** Text content to display */
  children?: React.ReactNode;
}
