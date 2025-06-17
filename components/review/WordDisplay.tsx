import { useMemo, memo, useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { TIMING_CONFIG } from '@/constants/animation';
import type { WordDisplayProps } from '@/types/ui/review.types';

/**
 * Component to display a word with optimal styling and sizing
 * Uses React.memo with a custom comparison function to prevent unnecessary re-renders
 */
const WordDisplay = memo(
  ({ word, fontSize = 24, style, translation }: WordDisplayProps) => {
    const colors = useColors();

    // Use opacity animation hook for translation visibility
    const { animatedStyle: translationAnimatedStyle, setOpacity } =
      useOpacityAnimation({
        initialOpacity: translation ? 1 : 0,
        duration: TIMING_CONFIG.GENTLE.duration,
      });

    // Update opacity when translation changes
    useEffect(() => {
      setOpacity(translation ? 1 : 0);
    }, [translation, setOpacity]);

    // Memoize the text style to prevent unnecessary re-renders
    // Use getArabicTextStyle as base and only override necessary properties
    const textStyle = useMemo(
      (): TextStyle => ({
        ...getArabicTextStyle(fontSize, {
          color: colors.arabicText,
          fontWeight: '700',
          textAlign: 'center', // Override to center for review cards
          // Remove conflicting paddingVertical - use container padding instead
          paddingVertical: LAYOUT.SPACING.MICRO,
          // Ensure proper text rendering without clipping
          includeFontPadding: false, // Disable to prevent clipping on Android
          textAlignVertical: 'center',
          // Add extra top padding to prevent descender clipping
          paddingTop: fontSize * 0.15,
          paddingBottom: fontSize * 0.05,
        }),
        ...(Platform.OS === 'ios'
          ? { ...LAYOUT.ELEVATION.SMALL, shadowColor: colors.shadow }
          : LAYOUT.ELEVATION.SUBTLE),
      }),
      [colors.arabicText, fontSize, colors.shadow]
    );

    // Use a key based on the word to ensure React completely replaces the component
    // when the word changes, preventing any visual glitches during transitions
    return (
      <View style={[styles.container, style]}>
        {/* Fixed Arabic text container - always in the same position */}
        <View style={styles.arabicContainer}>
          <ThemedText
            key={`word-${word}`}
            skipDefaultColor
            arabicFontSize={fontSize}
            style={textStyle}
            type="arabic"
          >
            {word}
          </ThemedText>
        </View>

        {/* Fixed translation container - always reserves space */}
        <View style={styles.translationContainer}>
          <Animated.View style={translationAnimatedStyle as ViewStyle}>
            <ThemedText skipDefaultColor colorName="englishText" style={styles.translationText}>
              {translation || ' '}
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    );
  },
  // Custom comparison function to ensure component only re-renders when props actually change
  (prevProps, nextProps) => {
    return (
      prevProps.word === nextProps.word &&
      prevProps.fontSize === nextProps.fontSize &&
      prevProps.style === nextProps.style &&
      prevProps.translation === nextProps.translation
    );
  }
);

WordDisplay.displayName = 'WordDisplay';

const styles = StyleSheet.create({
  arabicContainer: {
    alignItems: 'center',
    flex: 1, // Use flex instead of fixed height for better text accommodation
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM, // Reduced from LARGE to bring closer to translation
    // Reduced top padding for tighter spacing
    paddingTop: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
    paddingBottom: LAYOUT.SPACING.TINY, // Minimal bottom padding to get closer to translation
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * 9, // Keep same total height
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  translationContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to top to reduce visual gap
    marginTop: -LAYOUT.SPACING.TINY, // Negative margin to bring translation closer
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * 2.5, // Keep fixed height to prevent jumping
    paddingTop: LAYOUT.SPACING.TINY, // Small top padding for breathing room
  },
  translationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.1,
    fontWeight: '400',
    opacity: LAYOUT.OPACITY.HIGH,
    textAlign: 'center', // Slightly reduce opacity to create visual hierarchy
  },
});

export default WordDisplay;
