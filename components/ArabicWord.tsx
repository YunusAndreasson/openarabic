import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import type { Tables } from '@/types/database.types';
import { WordDetailsModal } from './WordDetailsModal';
import { LAYOUT } from '@/constants/layout';

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

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.wordContainer}>
        <ThemedText
          style={[
            styles.arabicText,
            {
              color: isSelected ? colors.highlightedArabicText : colors.text,
              fontSize: baseSize * scale,
              lineHeight: Math.round(baseSize * scale * 1.5),
            },
          ]}
          skipDefaultColor
        >
          {word.word_form}
        </ThemedText>
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
});
