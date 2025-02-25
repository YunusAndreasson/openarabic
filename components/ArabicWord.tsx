import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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

export function ArabicWord({
  word,
  isSelected,
  onPress,
  scale = 1,
  baseSize = 32,
}: ArabicWordProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleStudyPress = () => {
    onPress(word);
  };

  // Determine the text color based on whether the word is selected for study
  // Using appropriate grayscale colors for both light and dark modes
  const textColor = isSelected
    ? isDarkMode
      ? '#ced4da'
      : '#343a40' // Lighter gray in dark mode, darker gray in light mode
    : colors.text; // Use regular text color for other words

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.wordContainer}>
        <View>
          <ThemedText
            style={[
              styles.arabicText,
              {
                color: textColor,
                fontSize: baseSize * scale,
                lineHeight: Math.round(baseSize * scale * 1.5),
                fontWeight: isSelected ? '700' : 'normal', // Make selected words bold for emphasis
              },
            ]}
            skipDefaultColor
          >
            {word.word_form}
          </ThemedText>

          {/* Add a dotted underline for selected words in both light and dark modes */}
          {isSelected && (
            <View
              style={[
                styles.underline,
                {
                  width: baseSize * scale * word.word_form.length * 0.3, // Reduce width multiplier from 0.4 to 0.3
                  bottom: -1,
                  borderBottomColor: isDarkMode ? '#ced4da80' : '#34383c50', // Different colors for dark/light modes
                },
              ]}
            />
          )}
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

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: LAYOUT.SPACING.TINY / 2,
    marginVertical: LAYOUT.SPACING.TINY / 2,
  },
  arabicText: {
    fontFamily: 'NotoNaskhArabic',
  },
  underline: {
    position: 'absolute',
    height: 1,
    borderBottomWidth: 0.8,
    borderStyle: 'dotted',
    alignSelf: 'center',
  },
});
