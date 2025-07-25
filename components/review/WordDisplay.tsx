import { memo, useEffect, useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordDisplayProps } from '@/types/ui/review.types';

// ===== INTERFACES =====
interface BatchedWordDisplayColors {
  arabicText: string;
  shadow: string;
  englishText: string;
}

const WORD_DISPLAY_CONSTANTS = {
  DEFAULT_FONT_SIZE: LAYOUT.SPACING.XXLARGE,
  PADDING_TOP_RATIO: 0.15,
  PADDING_BOTTOM_RATIO: 0.05,
  TEXT_HEIGHT_MULTIPLIER: 9,
  TRANSLATION_HEIGHT_MULTIPLIER: 2.5,
  TRANSLATION_FONT_MULTIPLIER: 1.1,
} as const;

// Static animation configuration
const ANIMATION_CONFIG = {
  TRANSLATION_DURATION: TIMING_CONFIG.GENTLE.duration,
} as const;

const STATIC_STYLES = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * WORD_DISPLAY_CONSTANTS.TEXT_HEIGHT_MULTIPLIER,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  } as ViewStyle,
  arabicContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
    paddingBottom: LAYOUT.SPACING.TINY,
  } as ViewStyle,
  translationContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -LAYOUT.SPACING.TINY,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * WORD_DISPLAY_CONSTANTS.TRANSLATION_HEIGHT_MULTIPLIER,
    paddingTop: LAYOUT.SPACING.TINY,
  } as ViewStyle,
  translationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * WORD_DISPLAY_CONSTANTS.TRANSLATION_FONT_MULTIPLIER,
    fontWeight: '400',
    opacity: LAYOUT.OPACITY.HIGH,
    textAlign: 'center',
  } as TextStyle,
});

const calculateDynamicPadding = (fontSize: number) => ({
  paddingTop: fontSize * WORD_DISPLAY_CONSTANTS.PADDING_TOP_RATIO,
  paddingBottom: fontSize * WORD_DISPLAY_CONSTANTS.PADDING_BOTTOM_RATIO,
});

const createTextStyleBase = (fontSize: number) =>
  getArabicTextStyle(fontSize, {
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: LAYOUT.SPACING.MICRO,
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...calculateDynamicPadding(fontSize),
  });

const createTextStyle = (fontSize: number, colors: BatchedWordDisplayColors): TextStyle => {
  const baseStyle = createTextStyleBase(fontSize);
  return {
    ...baseStyle,
    color: colors.arabicText,
    ...LAYOUT.ELEVATION.SMALL,
    shadowColor: colors.shadow,
  };
};

/**
 * Component to display a word with optimal styling and sizing
 * Uses React.memo with a custom comparison function to prevent unnecessary re-renders
 */
const WordDisplayInternal = ({
  word,
  fontSize = WORD_DISPLAY_CONSTANTS.DEFAULT_FONT_SIZE,
  style,
  translation,
}: WordDisplayProps) => {
  const colors = useColors();

  // ===== COLOR BATCHING (PREVENTS MULTIPLE COLOR CALCULATIONS) =====
  const batchedColors = useMemo(
    () => ({
      arabicText: colors.arabicText,
      shadow: colors.shadow,
      englishText: colors.englishText,
    }),
    [colors.arabicText, colors.shadow, colors.englishText]
  );

  const textStyle = useMemo(
    () => createTextStyle(fontSize, batchedColors),
    [fontSize, batchedColors]
  );

  // ===== OPTIMIZED ANIMATION HANDLING =====
  const { animatedStyle: translationAnimatedStyle, setOpacity } = useOpacityAnimation({
    initialOpacity: translation ? 1 : 0,
    duration: ANIMATION_CONFIG.TRANSLATION_DURATION,
  });

  useEffect(() => {
    setOpacity(translation ? 1 : 0);
  }, [translation, setOpacity]);

  const containerStyle = useMemo(() => [STATIC_STYLES.container, style], [style]);

  const translationTextStyle = useMemo(
    () => [STATIC_STYLES.translationText, { color: batchedColors.englishText }],
    [batchedColors.englishText]
  );

  const arabicTextProps = useMemo(
    () => ({
      skipDefaultColor: true,
      arabicFontSize: fontSize,
      style: textStyle,
      type: 'arabic' as const,
      children: word,
    }),
    [fontSize, textStyle, word]
  );

  const translationTextProps = useMemo(
    () => ({
      skipDefaultColor: true,
      colorName: 'englishText' as const,
      style: translationTextStyle,
      children: translation || ' ',
    }),
    [translationTextStyle, translation]
  );

  return (
    <View style={containerStyle}>
      {/* Fixed Arabic text container - always in the same position */}
      <View style={STATIC_STYLES.arabicContainer}>
        <ThemedText key={`word-${word}`} {...arabicTextProps} />
      </View>

      {/* Fixed translation container - always reserves space */}
      <View style={STATIC_STYLES.translationContainer}>
        <Animated.View style={translationAnimatedStyle as ViewStyle}>
          <ThemedText {...translationTextProps} />
        </Animated.View>
      </View>
    </View>
  );
};

const WordDisplayComparison = (
  prevProps: WordDisplayProps,
  nextProps: WordDisplayProps
): boolean => {
  if (prevProps.word !== nextProps.word) return false;
  if (prevProps.fontSize !== nextProps.fontSize) return false;
  if (prevProps.translation !== nextProps.translation) return false;

  // Style object comparison - check reference first
  if (prevProps.style === nextProps.style) return true;
  if (prevProps.style === null && nextProps.style === null) return true;
  if (prevProps.style === null || nextProps.style === null) return false;

  return false; // Skip deep comparison for performance
};

export const WordDisplay = memo(WordDisplayInternal, WordDisplayComparison);

WordDisplay.displayName = 'WordDisplay';

export default WordDisplay;
