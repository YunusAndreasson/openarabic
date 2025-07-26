import { memo, useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordDisplayProps } from '@/types/ui/review.types';
import {
  createTextStyle,
  createTranslationTextStyle,
  type BatchedTextColors,
} from '@/utils/textStyleUtils';

const WORD_DISPLAY_CONSTANTS = {
  DEFAULT_FONT_SIZE: LAYOUT.SPACING.XXLARGE,
  TEXT_HEIGHT_MULTIPLIER: 9,
  TRANSLATION_HEIGHT_MULTIPLIER: 2.5,
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
});

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
    (): BatchedTextColors => ({
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
    () => createTranslationTextStyle(fontSize, batchedColors.englishText),
    [fontSize, batchedColors.englishText]
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
      type: 'body' as const,
      children: translation,
    }),
    [translationTextStyle, translation]
  );

  return (
    <View style={containerStyle}>
      <View style={STATIC_STYLES.arabicContainer}>
        <ThemedText {...arabicTextProps} />
      </View>
      {translation && (
        <Animated.View style={[STATIC_STYLES.translationContainer, translationAnimatedStyle]}>
          <ThemedText {...translationTextProps} />
        </Animated.View>
      )}
    </View>
  );
};

// ===== OPTIMIZED COMPARISON FUNCTION (PREVENT UNNECESSARY RE-RENDERS) =====
const WordDisplayComparison = (
  prevProps: WordDisplayProps,
  nextProps: WordDisplayProps
): boolean => {
  return (
    prevProps.word === nextProps.word &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.translation === nextProps.translation &&
    prevProps.style === nextProps.style
  );
};

export const WordDisplay = memo(WordDisplayInternal, WordDisplayComparison);

WordDisplay.displayName = 'WordDisplay';

export default WordDisplay;
