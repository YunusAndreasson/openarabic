import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

interface DictionaryWordCardProps {
  word: StudyWord;
  editMode: boolean;
  onDelete: () => void;
}

// Simple utility functions for difficulty
const getDifficultyLabel = (difficulty: number): string => {
  if (difficulty <= 1.5) return 'Easy';
  if (difficulty <= 2.5) return 'Medium';
  return 'Hard';
};

const getDifficultyColor = (difficulty: number, colors: any): string => {
  if (difficulty <= 1.5) return colors.success;
  if (difficulty <= 2.5) return colors.warning;
  return colors.error;
};

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, editMode, onDelete }) => {
    const colors = useColors();

    const handleDeletePress = useCallback(() => {
      selectionFeedback();
      onDelete();
    }, [onDelete]);

    const difficultyValue = word.fsrs_difficulty ?? 1.0;
    const difficultyColor = getDifficultyColor(difficultyValue, colors);
    const difficultyLabel = getDifficultyLabel(difficultyValue);

    // Get Arabic and English text from root
    const arabicText = word.root?.letters || 'Unknown Arabic';
    const englishText = word.root?.meaning || 'Unknown English';

    return (
      <View style={[styles.container, { backgroundColor: colors.elevation1 }]}>
        <View style={styles.content}>
          {/* Word Information */}
          <View style={styles.wordInfo}>
            <Text style={[styles.arabicText, { color: colors.text }]}>{arabicText}</Text>
            <Text style={[styles.englishText, { color: colors.secondaryText }]}>{englishText}</Text>
          </View>

          {/* Difficulty Indicator */}
          <View style={styles.rightSection}>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
              <Text style={[styles.difficultyText, { color: colors.white }]}>
                {difficultyLabel}
              </Text>
            </View>

            {/* Delete Button (only in edit mode) */}
            {editMode && (
              <Pressable
                style={[styles.deleteButton, { backgroundColor: colors.error }]}
                onPress={handleDeletePress}
                android_ripple={{
                  color: colors.white,
                  borderless: true,
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={colors.white}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.editMode === nextProps.editMode &&
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty &&
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning
    );
  }
);

DictionaryWordCard.displayName = 'DictionaryWordCard';

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  wordInfo: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  arabicText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    marginBottom: 1,
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '400',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  difficultyBadge: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
  },
  deleteButton: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
