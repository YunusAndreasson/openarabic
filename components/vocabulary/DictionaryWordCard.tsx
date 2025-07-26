import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
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

const getDifficultyColor = (difficulty: number, colors: ThemeColors): string => {
  if (difficulty <= 1.5) return colors.success;
  if (difficulty <= 2.5) return colors.warning;
  return colors.error;
};

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, editMode, onDelete }) => {
    const colors = useColors();
    const audioPlayer = useSimpleAudioPlayer();

    // Handle audio playback for Arabic pronunciation when card is pressed
    const handleCardPress = useCallback(async () => {
      if (!word.root?.audio_url || editMode) return;

      try {
        selectionFeedback();

        const track = {
          id: `word-${word.root_id}-ar`,
          audioUrl: word.root.audio_url,
          title: word.root.letters || 'Arabic Pronunciation',
        };

        await audioPlayer.play(track);
      } catch (error) {
        // Audio playback errors are handled silently to avoid disrupting the UX
        // Only log in development for debugging
        if (__DEV__) {
          console.warn('Failed to play word audio:', error);
        }
      }
    }, [word.root?.audio_url, word.root_id, word.root?.letters, audioPlayer, editMode]);

    // Handle delete button press
    const handleDeletePress = useCallback(() => {
      if (!editMode) return;

      selectionFeedback();
      onDelete();
    }, [editMode, onDelete]);

    const difficultyValue = word.fsrs_difficulty ?? 1.0;
    const difficultyColor = getDifficultyColor(difficultyValue, colors);
    const difficultyLabel = getDifficultyLabel(difficultyValue);

    // Get Arabic and English text from root
    const arabicText = word.root?.letters || 'Unknown Arabic';
    const englishText = word.root?.meaning || 'Unknown English';
    const hasAudio = !!word.root?.audio_url;

    return (
      <View style={styles.container}>
        <BaseCard
          style={styles.card}
          onPress={handleCardPress}
          disabled={editMode || !hasAudio}
          shadowSize="small"
          contentStyle={styles.cardContent}
        >
          <View style={styles.content}>
            {/* Word Information */}
            <View style={styles.wordInfo}>
              <Text style={[styles.arabicText, { color: colors.text }]}>{arabicText}</Text>
              <Text style={[styles.englishText, { color: colors.secondaryText }]}>
                {englishText}
              </Text>
            </View>

            {/* Right Section: Difficulty Badge */}
            <View style={styles.rightSection}>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
                <Text style={[styles.difficultyText, { color: colors.white }]}>
                  {difficultyLabel}
                </Text>
              </View>
            </View>
          </View>
        </BaseCard>

        {/* Delete Button (separate from card, only in edit mode) */}
        {editMode && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.error }]}
            onPress={handleDeletePress}
            activeOpacity={LAYOUT.OPACITY.PRESSED}
          >
            <Ionicons
              name="trash-outline"
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              color={colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.editMode === nextProps.editMode &&
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty &&
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning &&
      prevProps.word.root?.audio_url === nextProps.word.root?.audio_url
    );
  }
);

DictionaryWordCard.displayName = 'DictionaryWordCard';

const styles = StyleSheet.create({
  container: {
    height: 64,
    marginBottom: LAYOUT.SPACING.TINY,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  cardContent: {
    minHeight: 64,
    overflow: 'visible',
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
