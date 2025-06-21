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

// ===== STATIC CONSTANTS EXTRACTION (CRITICAL FOR PERFORMANCE) =====
const WORD_DISPLAY_CONSTANTS = {
  DEFAULT_FONT_SIZE: 24,
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

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
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

// ===== HELPER FUNCTIONS EXTRACTED (PURE FUNCTIONS OUTSIDE COMPONENT) =====
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

// ===== CACHE MANAGEMENT FOR PERFORMANCE =====
const clearOldestCacheEntry = (cache: Map<string, any>): void => {
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
  }
};

// Module-level cache for expensive style calculations
const styleCache = new Map<string, any>();
const CACHE_MAX_SIZE = 20; // Limit cache size

const getCachedTextStyle = (fontSize: number, colors: any): TextStyle => {
  const cacheKey = `${fontSize}-${colors.arabicText}-${colors.shadow}`;

  const cached = styleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const baseStyle = createTextStyleBase(fontSize);
  const result: TextStyle = {
    ...baseStyle,
    color: colors.arabicText,
    ...LAYOUT.ELEVATION.SMALL,
    shadowColor: colors.shadow,
  };

  // Manage cache size (LRU-style)
  if (styleCache.size >= CACHE_MAX_SIZE) {
    clearOldestCacheEntry(styleCache);
  }

  styleCache.set(cacheKey, result);
  return result;
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

  // ===== ADVANCED CACHING WITH MAP-BASED SOLUTION =====
  const textStyle = useMemo(
    () => getCachedTextStyle(fontSize, batchedColors),
    [fontSize, batchedColors]
  );

  // ===== OPTIMIZED ANIMATION HANDLING =====
  const { animatedStyle: translationAnimatedStyle, setOpacity } = useOpacityAnimation({
    initialOpacity: translation ? 1 : 0,
    duration: ANIMATION_CONFIG.TRANSLATION_DURATION,
  });

  // Update opacity when translation changes - memoized to prevent unnecessary calls
  useEffect(() => {
    setOpacity(translation ? 1 : 0);
  }, [translation, setOpacity]);

  // ===== MEMOIZED STYLE OBJECTS (PREVENTS CHILD RE-RENDERS) =====
  const containerStyle = useMemo(() => [STATIC_STYLES.container, style], [style]);

  const translationTextStyle = useMemo(
    () => [STATIC_STYLES.translationText, { color: batchedColors.englishText }],
    [batchedColors.englishText]
  );

  // ===== MEMOIZED CHILD PROPS =====
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

// ===== CUSTOM MEMO COMPARISON FUNCTION (PREVENTS UNNECESSARY RE-RENDERS) =====
const WordDisplayComparison = (
  prevProps: WordDisplayProps,
  nextProps: WordDisplayProps
): boolean => {
  // Compare primitive values first (fastest)
  if (prevProps.word !== nextProps.word) return false;
  if (prevProps.fontSize !== nextProps.fontSize) return false;
  if (prevProps.translation !== nextProps.translation) return false;

  // Style object comparison (most expensive) - check reference first
  if (prevProps.style === nextProps.style) return true;
  if (prevProps.style === null && nextProps.style === null) return true;
  if (prevProps.style === null || nextProps.style === null) return false;

  // Deep comparison only if references differ
  return JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style);
};

export const WordDisplay = memo(WordDisplayInternal, WordDisplayComparison);

WordDisplay.displayName = 'WordDisplay';

export default WordDisplay;
