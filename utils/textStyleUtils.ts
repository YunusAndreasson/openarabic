import type { TextStyle, ViewStyle } from 'react-native';

import { getArabicTextStyle, LAYOUT } from '@/constants/layout';

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

// Button text styling used to live here as `createButtonTextStyle(size)`, which
// overrode the `fontSize` that ThemedButton had already chosen via a ThemedText
// type — so every button rendered a step larger than it declared. Button
// typography is now decided once, by `TEXT_TYPE_MAP` in ThemedButton.
