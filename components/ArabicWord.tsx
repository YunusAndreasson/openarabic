import React, { useState, memo, useMemo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, TextStyle, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import type { Tables } from '@/types/database.types';
import { WordDetailsModal } from './WordDetailsModal';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

type WordWithDetails = Tables<'sentence_words'> & {
  root: Tables<'roots'> | null;
  word_type: Tables<'word_types'> | null;
};

interface ArabicWordProps {
  word: WordWithDetails;
  isSelected: boolean;
  onPress: (word: Tables<'sentence_words'>) => void;
  scale?: number;
  baseSize?: number;
}

function ArabicWordComponent({
  word,
  isSelected,
  onPress,
  scale = 1,
  baseSize = 32,
}: ArabicWordProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const handlePress = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleStudyPress = useCallback(() => {
    onPress(word);
  }, [onPress, word]);

  // Determine the text color based on whether the word is selected for study
  const textColor = isSelected ? colors.tint : colors.text;

  // Memoize the text style to prevent unnecessary re-renders
  const textStyle = useMemo(
    () => ({
      ...styles.arabicText,
      color: textColor,
      fontSize: baseSize * scale,
      lineHeight: Math.round(baseSize * scale * 1.5),
      fontWeight: isSelected ? '600' : ('normal' as TextStyle['fontWeight']),
    }),
    [textColor, baseSize, scale, isSelected]
  );

  // Memoize the underline style
  const underlineStyle = useMemo(
    () => ({
      ...styles.underline,
      width: `${Math.min(100, word.word_form.length * 90)}%` as any,
      backgroundColor: isDarkMode
        ? `${colors.tint}60` // 60% opacity in dark mode
        : `${colors.tint}40`, // 40% opacity in light mode
    }),
    [isDarkMode, colors.tint, word.word_form.length]
  );

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.wordContainer}>
        <View style={styles.wordWrapper}>
          <ThemedText style={textStyle} skipDefaultColor>
            {word.word_form}
          </ThemedText>

          {/* Enhanced underline for selected words */}
          {isSelected && <View style={underlineStyle} />}
        </View>
      </TouchableOpacity>
      <WordDetailsModal
        visible={modalVisible}
        onClose={handleModalClose}
        word={word}
        isSelected={isSelected}
        onStudyPress={handleStudyPress}
      />
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ArabicWord = memo(ArabicWordComponent);

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: LAYOUT.SPACING.TINY / 2,
    marginVertical: LAYOUT.SPACING.TINY / 2,
  },
  wordWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  arabicText: {
    fontFamily: 'NotoNaskhArabic',
  },
  underline: {
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
  },
});
