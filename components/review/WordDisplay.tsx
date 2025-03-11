import React from 'react';
import { View, ViewStyle, Platform, StyleSheet } from 'react-native';
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
const WordDisplay: React.FC<WordDisplayProps> = ({ word, fontSize, style }) => {
  const colors = useColors();

  // Calculate letter spacing based on font size
  const letterSpacing =
    fontSize > 180
      ? -5
      : fontSize > 140
        ? -4
        : fontSize > 100
          ? -3
          : fontSize > 80
            ? -2
            : fontSize > 60
              ? -1
              : 0;

  return (
    <View style={[styles.container, style]}>
      <ThemedText
        type="arabic"
        arabicFontSize={fontSize}
        style={[
          {
            color: colors.tint,
            fontWeight: '900',
            textAlign: 'center',
            letterSpacing,
            transform: [{ scale: 1.05 }],
            marginHorizontal: -10,
            ...Platform.select({
              ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
              },
              android: {
                elevation: 5,
              },
            }),
          },
        ]}
        skipDefaultColor
      >
        {word}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    minHeight: 320,
  },
});

export default WordDisplay;
