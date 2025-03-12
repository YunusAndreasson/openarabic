import React, { useMemo } from 'react';
import { View, ViewStyle, Platform, StyleSheet, TextStyle } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';

interface WordDisplayProps {
  word: string;
  fontSize: number;
  style?: ViewStyle;
}

/**
 * Component to display a word with optimal styling and sizing
 */
const WordDisplay: React.FC<WordDisplayProps> = React.memo(({ word, fontSize, style }) => {
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

  return (
    <View style={[styles.container, style]}>
      <ThemedText type="arabic" arabicFontSize={fontSize} style={textStyle} skipDefaultColor>
        {word}
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
});

export default WordDisplay;
