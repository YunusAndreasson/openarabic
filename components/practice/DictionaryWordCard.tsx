import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';

interface DictionaryWordCardProps {
  word: StudyWord;
  editMode: boolean;
  onDelete: () => void;
}

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
        await handleError(error instanceof Error ? error : String(error), {
          showToast: false,
          captureSentry: !__DEV__,
        });
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
            {/* Left: colored status dot + English */}
            <View style={styles.leftSection}>
              <View style={[styles.statusDot, { backgroundColor: difficultyColor }]} />
              <ThemedText
                type="body"
                variant="secondary"
                style={styles.englishText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {englishText}
              </ThemedText>
            </View>

            {/* Right: Arabic (prominent, right-aligned) */}
            <View style={styles.rightSection}>
              <ThemedText
                type="arabic"
                arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XXLARGE}
                weight="600"
                numberOfLines={1}
                style={{ includeFontPadding: true }}
              >
                {arabicText}
              </ThemedText>
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
            <Ionicons name="trash" size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={colors.white} />
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
    height: LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  cardContent: {
    minHeight: LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM,
    overflow: 'visible',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: 0,
  },
  leftSection: {
    width: 96, // slightly reduced to give Arabic more room
    flexShrink: 0,
    paddingRight: LAYOUT.SPACING.SMALL,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    textAlign: 'left',
    includeFontPadding: false,
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.1),
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  statusDot: {
    width: LAYOUT.SPACING.SMALL,
    height: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.SMALL / 2,
    marginRight: LAYOUT.SPACING.TINY,
  },
  deleteButton: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
