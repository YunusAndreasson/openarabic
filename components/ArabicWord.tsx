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
  const textColor = isSelected ? colors.tint : colors.text;

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.wordContainer}>
        <View style={styles.wordWrapper}>
          <ThemedText
            style={[
              styles.arabicText,
              {
                color: textColor,
                fontSize: baseSize * scale,
                lineHeight: Math.round(baseSize * scale * 1.5),
                fontWeight: isSelected ? '600' : 'normal', // Slightly bolder for selected words
              },
            ]}
            skipDefaultColor
          >
            {word.word_form}
          </ThemedText>

          {/* Enhanced underline for selected words */}
          {isSelected && (
            <View
              style={[
                styles.underline,
                {
                  width: `${Math.min(100, word.word_form.length * 90)}%`, // Responsive width based on word length
                  backgroundColor: isDarkMode
                    ? `${colors.tint}60` // 60% opacity in dark mode
                    : `${colors.tint}40`, // 40% opacity in light mode
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
