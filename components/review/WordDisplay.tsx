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
import { createTextStyle, type BatchedTextColors } from '@/utils/textStyleUtils';

const WORD_DISPLAY_CONSTANTS = {
  DEFAULT_FONT_SIZE: LAYOUT.SPACING.XXLARGE,
  ARABIC_FONT_SIZE: LAYOUT.SPACING.XXLARGE * 2, // Very large for Arabic (64px)
  ENGLISH_FONT_SIZE: LAYOUT.SPACING.XXLARGE, // Legacy constant (not used when using regular ThemedText)
  ARABIC_TOP_POSITION: LAYOUT.SPACING.MEDIUM, // Arabic higher up but not at very top (12px)
  ENGLISH_TOP_OFFSET: LAYOUT.SPACING.XXLARGE * 4, // Move slightly closer below Arabic (192px)
  CONTAINER_HEIGHT: LAYOUT.SPACING.XXXLARGE * 7, // Much taller container (336px)
} as const;

// Static animation configuration
const ANIMATION_CONFIG = {
  TRANSLATION_DURATION: TIMING_CONFIG.GENTLE.duration,
} as const;

const STATIC_STYLES = StyleSheet.create({
  container: {
    width: '100%',
    height: WORD_DISPLAY_CONSTANTS.CONTAINER_HEIGHT,
    position: 'relative',
  } as ViewStyle,
  arabicContainer: {
    position: 'absolute',
    top: WORD_DISPLAY_CONSTANTS.ARABIC_TOP_POSITION,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  } as ViewStyle,
  translationContainer: {
    position: 'absolute',
    top: WORD_DISPLAY_CONSTANTS.ENGLISH_TOP_OFFSET,
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.LARGE, // Extra top padding to ensure no overlap
    zIndex: 9999, // Extremely high z-index to ensure it's above everything
    minHeight: LAYOUT.SPACING.XXXLARGE * 2, // Ensure container has enough height for text
  } as ViewStyle,
});

/**
 * Component to display a word with optimal styling and sizing
 * Uses React.memo with a custom comparison function to prevent unnecessary re-renders
 */
const WordDisplayInternal = ({ word, style, translation }: WordDisplayProps) => {
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

  // Use larger font for Arabic, smaller for English
  const arabicTextStyle = useMemo(
    () => createTextStyle(WORD_DISPLAY_CONSTANTS.ARABIC_FONT_SIZE, batchedColors),
    [batchedColors]
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

  // Using regular ThemedText for translation; style handled by typography system

  const arabicTextProps = useMemo(
    () => ({
      skipDefaultColor: true,
      arabicFontSize: WORD_DISPLAY_CONSTANTS.ARABIC_FONT_SIZE,
      style: arabicTextStyle,
      type: 'arabic' as const,
      children: word,
    }),
    [arabicTextStyle, word]
  );

  const translationTextProps = useMemo(
    () => ({
      variant: 'error' as const,
      type: 'heading2' as const,
      children: translation,
    }),
    [translation]
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
    prevProps.translation === nextProps.translation &&
    prevProps.style === nextProps.style
  );
};

export const WordDisplay = memo(WordDisplayInternal, WordDisplayComparison);

WordDisplay.displayName = 'WordDisplay';

export default WordDisplay;
