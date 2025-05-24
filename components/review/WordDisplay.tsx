import React, { useMemo, memo } from 'react';
import type { TextStyle } from 'react-native';
import { View, Platform, StyleSheet } from 'react-native';

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
        color: colors.tint,
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: LAYOUT.SPACING.MEDIUM,
        lineHeight: fontSize * 1.7,
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: colors.shadow,
              ...LAYOUT.SHADOW.SMALL,
            }
          : {
              elevation: LAYOUT.ELEVATION.SUBTLE,
            }),
      }),
      [colors, fontSize]
    );

    // Use a key based on the word to ensure React completely replaces the component
    // when the word changes, preventing any visual glitches during transitions
    return (
      <View style={[styles.container, style]}>
        <ThemedText
          key={`word-${word}`}
          type="arabic"
          arabicFontSize={fontSize}
          style={textStyle}
          skipDefaultColor
        >
          {word}
        </ThemedText>
        {translation && (
          <ThemedText style={styles.translationText} colorName="tint" skipDefaultColor>
            {translation}
          </ThemedText>
        )}
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
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE * 7,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  translationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    fontWeight: '500',
  },
});

export default WordDisplay;
