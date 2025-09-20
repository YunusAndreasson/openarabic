import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { DifficultyBar } from '@/components/study/DifficultyBar';
import { ICON_BUTTON_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { generateAudioUrl } from '@/utils/imageUtils';

interface DictionaryWordCardProps {
  word: StudyWord;
  editMode: boolean;
  onDelete: () => void;
}

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, editMode, onDelete }) => {
    const colors = useColors();

    // Press animation for delete button
    const {
      animatedStyle: deleteButtonAnimatedStyle,
      handlePressIn,
      handlePressOut,
    } = usePressAnimation({
      scaleAmount: ICON_BUTTON_PRESS_SCALE,
    });
    const audioPlayer = useSimpleAudioPlayer();

    // Handle audio playback for word pronunciation when card is pressed
    const handleCardPress = useCallback(async () => {
      if (editMode) return;

      try {
        selectionFeedback();

        // Prefer Arabic audio, fallback to English audio if available
        const audioUrl =
          generateAudioUrl(word.root?.audio_url) || generateAudioUrl(word.root?.audio_url_en);
        if (!audioUrl) return;

        const track = {
          id: `word-${word.root_id}-${word.root?.audio_url ? 'ar' : 'en'}`,
          audioUrl,
          title: word.root?.letters || word.root?.meaning || 'Arabic Pronunciation',
        };

        await audioPlayer.play(track);
      } catch (error) {
        await handleError(error instanceof Error ? error : String(error), {
          showToast: false,
          captureSentry: !__DEV__,
        });
      }
    }, [
      word.root?.audio_url,
      word.root?.audio_url_en,
      word.root_id,
      word.root?.letters,
      word.root?.meaning,
      audioPlayer,
      editMode,
      generateAudioUrl,
    ]);

    // Handle delete button press
    const handleDeletePress = useCallback(() => {
      if (!editMode) return;

      selectionFeedback();
      onDelete();
    }, [editMode, onDelete]);

    const difficultyValue = word.fsrs_difficulty ?? 1.0;

    // Get Arabic and English text from root
    const arabicText = word.root?.letters || 'Unknown Arabic';
    const englishText = word.root?.meaning || 'Unknown English';

    return (
      <View style={styles.container}>
        <BaseCard
          style={styles.card}
          onPress={handleCardPress}
          disabled={editMode}
          shadowSize="small"
          contentStyle={styles.cardContent}
        >
          <View style={styles.content}>
            {/* Left: English text with difficulty bar below */}
            <View style={styles.leftSection}>
              <View style={styles.textContainer}>
                <ThemedText
                  type="body"
                  variant="secondary"
                  style={styles.englishText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {englishText}
                </ThemedText>
                <DifficultyBar difficulty={difficultyValue} width={48} height={3} />
              </View>
            </View>

            {/* Right: Arabic (prominent, right-aligned) */}
            <View style={styles.rightSection}>
              <ThemedText
                type="arabic"
                arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XXLARGE}
                weight="semibold"
                numberOfLines={1}
                style={styles.arabicText}
              >
                {arabicText}
              </ThemedText>
            </View>
          </View>
        </BaseCard>

        {/* Delete Button (separate from card, only in edit mode) */}
        {editMode && (
          <TouchableOpacity
            style={deleteButtonAnimatedStyle as any}
            onPress={handleDeletePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
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
    marginBottom: LAYOUT.SPACING.SMALL,
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
    width: LAYOUT.CARD.WIDTH.DICTIONARY_LEFT_SECTION, // slightly reduced to give Arabic more room
    flexShrink: 0,
    paddingRight: LAYOUT.SPACING.SMALL,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: LAYOUT.SPACING.SMALL,
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
  arabicText: {
    includeFontPadding: true,
  },

  deleteButton: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
