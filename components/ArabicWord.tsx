import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import type { Tables } from '@/types/database.types';

interface ArabicWordProps {
  word: Tables<'sentence_words'> & {
    root: Tables<'roots'>;
    word_type: Tables<'word_types'>;
  };
  isSelected?: boolean;
  onPress?: (word: ArabicWordProps['word']) => void;
}

export function ArabicWord({ word, isSelected, onPress }: ArabicWordProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(word);
  };

  const textColor = isSelected ? colors.highlightedArabicText : colors.arabicText;

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
      <ThemedText style={[styles.text, { color: textColor }]} skipDefaultColor>
        {word.word_form}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
  },
  text: {
    fontSize: 32,
    lineHeight: 48,
    writingDirection: 'rtl',
    fontFamily: 'NotoNaskhArabic',
    includeFontPadding: false,
  },
});
