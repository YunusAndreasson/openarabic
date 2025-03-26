import React, { useMemo } from 'react';
import { View, Platform, StyleSheet, TextStyle } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';
import { WordDisplayProps } from '@/types/ui/review.types';

/**
 * Component to display a word with optimal styling and sizing
 * Uses React.memo with a custom comparison function to prevent unnecessary re-renders
 */
const WordDisplay = React.memo(
  ({ word, fontSize, style }: WordDisplayProps) => {
    const colors = useColors();

    // Memoize the text style to prevent unnecessary re-renders
    const textStyle = useMemo(
      (): TextStyle => ({
        color: colors.tint,
        fontWeight: '700',
        textAlign: 'center',
        paddingBottom: 5,
        ...Platform.select({
          ios: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          },
          android: {
            elevation: 3,
          },
        }),
      }),
      [colors]
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
      </View>
    );
  },
  // Custom comparison function to ensure component only re-renders when props actually change
  (prevProps, nextProps) => {
    return (
      prevProps.word === nextProps.word &&
      prevProps.fontSize === nextProps.fontSize &&
      prevProps.style === nextProps.style
    );
  }
);

WordDisplay.displayName = 'WordDisplay';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
});

export default WordDisplay;
