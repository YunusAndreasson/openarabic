import React, { useMemo, memo } from 'react';
import type { TextStyle } from 'react-native';
import { View, Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import type { WordDisplayProps } from '@/types/ui/review.types';

import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';

/**
 * Component to display a word with optimal styling and sizing
 * Uses React.memo with a custom comparison function to prevent unnecessary re-renders
 */
const WordDisplay = memo(
  ({ word, fontSize = 24, style, translation }: WordDisplayProps) => {
    const colors = useColors();

    // Memoize the text style to prevent unnecessary re-renders
    const textStyle = useMemo(
      (): TextStyle => ({
        color: colors.arabicText,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: fontSize * 1.8, // Increased line height for better Arabic text rendering
        paddingTop: fontSize * 0.1, // Small top padding to prevent clipping
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: colors.shadow,
              ...LAYOUT.SHADOW.SMALL,
            }
          : {
              elevation: LAYOUT.ELEVATION.SUBTLE,
            }),
      }),
      [colors.arabicText, fontSize, colors.shadow]
    );

    // Animated style for translation with smooth opacity transition
    const translationAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: withTiming(translation ? 1 : 0, { duration: 300 }),
      };
    }, [translation]);

    // Use a key based on the word to ensure React completely replaces the component
    // when the word changes, preventing any visual glitches during transitions
    return (
      <View style={[styles.container, style]}>
        {/* Fixed Arabic text container - always in the same position */}
        <View style={styles.arabicContainer}>
          <ThemedText
            key={`word-${word}`}
            type="arabic"
            arabicFontSize={fontSize}
            style={textStyle}
            skipDefaultColor
          >
            {word}
          </ThemedText>
        </View>

        {/* Fixed translation container - always reserves space */}
        <View style={styles.translationContainer}>
          <Animated.View style={translationAnimatedStyle}>
            <ThemedText style={styles.translationText} colorName="englishText" skipDefaultColor>
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
    paddingVertical: LAYOUT.SPACING.LARGE, // Increased padding to prevent clipping
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * 9, // Increased total height
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  translationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.SMALL, // Reduced margin to balance spacing
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * 2.5, // Fixed height for translation to prevent jumping
  },
  translationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.1,
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default WordDisplay;
