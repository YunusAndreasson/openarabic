import type { TextStyle, ViewStyle } from 'react-native';

import { LAYOUT, TYPOGRAPHY_HIERARCHY, getArabicTextStyle } from '@/constants/layout';

// ===== TEXT STYLE CONSTANTS =====
export const TEXT_STYLE_CONSTANTS = {
  PADDING_TOP_RATIO: 0.15,
  PADDING_BOTTOM_RATIO: 0.05,
} as const;

// ===== MEANING OVERLAY CONSTANTS =====
export const MEANING_OVERLAY_CONSTANTS = {
  FONT_SIZE_SPECIAL: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + LAYOUT.SPACING.TINY, // 20 + 4 = 24px
  FONT_SIZE_DEFAULT: LAYOUT.TYPOGRAPHY.SCALE.XLARGE, // 20px
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
  bottomRatio: number = TEXT_STYLE_CONSTANTS.PADDING_BOTTOM_RATIO
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
 * Creates translation text style with specific formatting
 * @param fontSize - The font size for the translation text
 * @param color - The color for the translation text
 * @returns Translation text style object
 */
export const createTranslationTextStyle = (fontSize: number, color: string): TextStyle => ({
  // Use exact requested font size and ensure adequate lineHeight to prevent clipping
  fontSize,
  lineHeight: Math.round(fontSize * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL),
  includeFontPadding: false,
  fontWeight: '400',
  opacity: LAYOUT.OPACITY.HIGH,
  textAlign: 'center',
  color,
});

/**
 * Interface for color values used in meaning overlay
 */
export interface MeaningOverlayColors {
  warning: string;
  error: string;
  text: string;
}

/**
 * Determines text color based on warning, vague, and struggling flags
 * @param isWarning - Whether the text should be shown as a warning
 * @param isVague - Whether the text should be shown as vague
 * @param isStruggling - Whether the text should be shown as struggling
 * @param colors - Object containing color values
 * @returns The appropriate text color
 */
export const determineTextColor = (
  isWarning: boolean,
  isVague: boolean,
  isStruggling: boolean,
  colors: MeaningOverlayColors
): string => {
  if (isWarning) return colors.warning;
  if (isVague) return colors.warning;
  if (isStruggling) return colors.error;
  return colors.text;
};

/**
 * Calculates font size based on warning, vague, and struggling flags
 * @param isWarning - Whether the text should be shown as a warning
 * @param isVague - Whether the text should be shown as vague
 * @param isStruggling - Whether the text should be shown as struggling
 * @returns The appropriate font size
 */
export const calculateFontSize = (
  isWarning: boolean,
  isVague: boolean,
  isStruggling: boolean
): number => {
  if (isWarning || isVague || isStruggling) {
    return MEANING_OVERLAY_CONSTANTS.FONT_SIZE_SPECIAL;
  }
  return MEANING_OVERLAY_CONSTANTS.FONT_SIZE_DEFAULT;
};

/**
 * Creates text style for meaning overlay with color and font size
 * @param textColor - The color for the text
 * @param fontSize - The font size for the text
 * @param baseStyle - Base style object to extend
 * @returns Complete text style object
 */
export const createMeaningOverlayTextStyle = (
  textColor: string,
  fontSize: number,
  baseStyle: TextStyle = {}
): TextStyle => {
  return {
    ...baseStyle,
    color: textColor,
    fontSize: fontSize,
  };
};

/**
 * Interface for color values used in Arabic word selection
 */
export interface ArabicWordColors {
  wordDueUnderline: string;
  wordSelectionUnderline: string;
}

/**
 * Creates selected style for Arabic words based on selection state and due status
 * @param isSelected - Whether the word is currently selected
 * @param isDueWord - Whether the word is a due word (affects underline color)
 * @param colors - Object containing color values
 * @returns ViewStyle object for the selected state, or empty object if not selected
 */
export const getSelectedStyle = (
  isSelected: boolean,
  isDueWord: boolean,
  colors: ArabicWordColors
): ViewStyle => {
  if (!isSelected) {
    return {};
  }

  return {
    borderBottomWidth: 1,
    borderBottomColor: isDueWord ? colors.wordDueUnderline : colors.wordSelectionUnderline,
  };
};
