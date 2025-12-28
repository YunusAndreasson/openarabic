import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordDisplayProps } from '@/types/ui/review.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { createTextStyle, type BatchedTextColors } from '@/utils/textStyleUtils';

const WORD_DISPLAY_CONSTANTS = {
  ARABIC_FONT_SIZE: LAYOUT.SPACING.XXLARGE * 2, // Very large for Arabic (64px)

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
    zIndex: LAYOUT.Z_INDEX.CARD,
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
    zIndex: LAYOUT.Z_INDEX.TOP_OVERLAY, // Maximum z-index to ensure it's above everything
    minHeight: LAYOUT.SPACING.XXXLARGE * 2, // Ensure container has enough height for text
  } as ViewStyle,
});

/**
 * Component to display a word with optimal styling and sizing
 */
export function WordDisplay({ word, style, translation, onWordPress }: WordDisplayProps) {
  const colors = useColors();

  // Color batching
  const batchedColors: BatchedTextColors = {
    arabicText: colors.arabicText,
    shadow: colors.shadow,
    englishText: colors.englishText,
  };

  // Use larger font for Arabic, smaller for English
  const arabicTextStyle = createTextStyle(WORD_DISPLAY_CONSTANTS.ARABIC_FONT_SIZE, batchedColors);

  // Animation handling
  // Always start at 0 opacity, let useEffect be single source of truth for animation state
  const { animatedStyle: translationAnimatedStyle, setOpacity } = useOpacityAnimation({
    initialOpacity: 0,
    duration: ANIMATION_CONFIG.TRANSLATION_DURATION,
  });

  useEffect(() => {
    // Single animation trigger - no double-trigger on mount
    setOpacity(translation ? 1 : 0);
  }, [translation, setOpacity]);

  const containerStyle = [STATIC_STYLES.container, style];

  const arabicTextProps = {
    skipDefaultColor: true,
    arabicFontSize: WORD_DISPLAY_CONSTANTS.ARABIC_FONT_SIZE,
    style: arabicTextStyle,
    type: 'arabic' as const,
    children: word,
  };

  const translationTextProps = {
    variant: 'error' as const,
    type: 'heading2' as const,
    children: translation ? capitalizeFirstLetter(translation) : translation,
  };

  const handleWordPress = () => {
    if (onWordPress) {
      onWordPress();
    }
  };

  return (
    <View style={containerStyle}>
      <Pressable
        style={STATIC_STYLES.arabicContainer}
        onPress={handleWordPress}
        disabled={!onWordPress}
      >
        <ThemedText {...arabicTextProps} />
      </Pressable>
      {translation && (
        <Animated.View style={[STATIC_STYLES.translationContainer, translationAnimatedStyle]}>
          <ThemedText {...translationTextProps} />
        </Animated.View>
      )}
    </View>
  );
}

WordDisplay.displayName = 'WordDisplay';
