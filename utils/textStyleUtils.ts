import type { TextStyle, ViewStyle } from 'react-native';

import { FONTS } from '@/constants/fonts';
import { getArabicTextStyle, LAYOUT, LETTER_SPACING } from '@/constants/layout';

// ===== TEXT STYLE CONSTANTS =====
export const TEXT_STYLE_CONSTANTS = {
  PADDING_TOP_RATIO: 0.15,
  PADDING_BOTTOM_RATIO: 0.05,
} as const;

/**
 * Calculates dynamic padding based on font size
 * @param fontSize - The font size to base padding calculations on
 * @param topRatio - The ratio for top padding (default: 0.15)
 * @param bottomRatio - The ratio for bottom padding (default: 0.05)
 * @returns Object with paddingTop and paddingBottom values
 */
export const calculateDynamicPadding = (
  fontSize: number,
  topRatio: number = TEXT_STYLE_CONSTANTS.PADDING_TOP_RATIO,
  bottomRatio: number = TEXT_STYLE_CONSTANTS.PADDING_BOTTOM_RATIO,
) => ({
  paddingTop: fontSize * topRatio,
  paddingBottom: fontSize * bottomRatio,
});

/**
 * Creates base text style for Arabic text with dynamic padding
 * @param fontSize - The font size for the text
 * @param additionalStyles - Additional styles to merge with base style
 * @returns Base text style object
 */
export const createTextStyleBase = (fontSize: number, additionalStyles: TextStyle = {}) =>
  getArabicTextStyle(fontSize, {
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: LAYOUT.SPACING.MICRO,
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...calculateDynamicPadding(fontSize),
    ...additionalStyles,
  });

/**
 * Interface for batched color values used in text styling
 */
export interface BatchedTextColors {
  arabicText: string;
  shadow: string;
  englishText: string;
}

/**
 * Creates complete text style with colors and elevation
 * @param fontSize - The font size for the text
 * @param colors - Object containing color values
 * @returns Complete text style object
 */
export const createTextStyle = (fontSize: number, colors: BatchedTextColors): TextStyle => {
  const baseStyle = createTextStyleBase(fontSize);
  return {
    ...baseStyle,
    color: colors.arabicText,
    ...LAYOUT.ELEVATION.SMALL,
    shadowColor: colors.shadow,
  };
};

/**
 * Creates underline style for Arabic words based on selection state
 * @param isSelected - Whether the word is currently selected (in study list)
 * @param color - The underline color to use
 * @returns ViewStyle object for the underline, or empty object if not selected
 */
export const getSelectedStyle = (isSelected: boolean, color: string): ViewStyle => {
  if (!isSelected) {
    return {};
  }

  return {
    borderBottomWidth: 1,
    borderBottomColor: color,
  };
};

// ===== BUTTON TEXT STYLING UTILITIES =====

/**
 * Creates consistent button text styling
 * @param size - Button size variant ('small' | 'medium' | 'large')
 * @returns TextStyle object for button text
 */
export const createButtonTextStyle = (size: 'small' | 'medium' | 'large' = 'medium'): TextStyle => {
  const baseStyle: TextStyle = {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    textAlign: 'center',
  };

  switch (size) {
    case 'small':
      return {
        ...baseStyle,
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        letterSpacing: LETTER_SPACING.NORMAL,
      };
    case 'large':
      return {
        ...baseStyle,
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
        letterSpacing: LETTER_SPACING.SLIGHT_POSITIVE,
      };
    case 'medium':
    default:
      return {
        ...baseStyle,
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        letterSpacing: LETTER_SPACING.SLIGHT_POSITIVE,
      };
  }
};
