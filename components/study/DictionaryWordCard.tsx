import { BaseCard } from '@/components/common';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { DeleteButton } from '@/components/bookmarks';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useEditModeCardAnimation } from '@/hooks/cards';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { getStabilityProgressColor } from '@/utils/urgencyScore';

interface DictionaryWordCardProps {
  word: StudyWord;
  editMode: boolean;
  onDelete: () => void;
}

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, editMode, onDelete }) => {
    const colors = useColors();

    // Use consolidated word audio playback hook
    const playWordAudio = useWordAudioPlayback({ showErrorToast: false });

    // Edit mode animation (scales down when in edit mode)
    const { animatedStyle } = useEditModeCardAnimation({ editMode });

    // Handle audio playback for word pronunciation when card is pressed
    const handleCardPress = useCallback(async () => {
      if (editMode) return;

      // Play word audio using consolidated hook (includes haptics & error handling)
      await playWordAudio({
        id: word.root_id,
        audio_url: word.root?.audio_url,
        audio_url_en: word.root?.audio_url_en,
        letters: word.root?.letters,
        meaning: word.root?.meaning,
      });
    }, [
      editMode,
      word.root_id,
      word.root?.audio_url,
      word.root?.audio_url_en,
      word.root?.letters,
      word.root?.meaning,
      playWordAudio,
    ]);

    // Handle delete button press
    const handleDeletePress = useCallback(() => {
      if (!editMode) return;
      onDelete();
    }, [editMode, onDelete]);

    // Get Arabic and English text from root
    const arabicText = word.root?.letters || 'Unknown Arabic';
    const rawEnglishText = word.root?.meaning || 'Unknown English';

    // Capitalize first letter of English text for display
    const englishText = useMemo(() => capitalizeFirstLetter(rawEnglishText), [rawEnglishText]);

    // Get dot color based on stability level (error=red, warning=orange, success=green)
    const dotColorKey = useMemo(
      () => getStabilityProgressColor(word.fsrs_stability),
      [word.fsrs_stability],
    );

    return (
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        <View style={styles.cardWrapper}>
          <BaseCard
            style={styles.card}
            onPress={editMode ? undefined : handleCardPress}
            shadowSize="small"
            contentStyle={styles.cardContent}
          >
            <View style={styles.content}>
              {/* English text with colored dot indicator below */}
              <View style={styles.leftSection}>
                <ThemedText
                  type="body"
                  variant="secondary"
                  style={styles.englishText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {englishText}
                </ThemedText>
                {/* Memory strength dot indicator */}
                <View style={[styles.memoryDot, { backgroundColor: colors[dotColorKey] }]} />
              </View>

              {/* Arabic text (vertically centered) */}
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
        </View>

        {/* Delete Button - shows on right in edit mode (similar to bookmarks) */}
        {editMode && (
          <View style={styles.deleteButtonContainer}>
            <DeleteButton onPress={handleDeletePress} />
          </View>
        )}
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.editMode === nextProps.editMode &&
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_state === nextProps.word.fsrs_state &&
      prevProps.word.fsrs_stability === nextProps.word.fsrs_stability &&
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty &&
      prevProps.word.fsrs_lapses === nextProps.word.fsrs_lapses &&
      prevProps.word.fsrs_due === nextProps.word.fsrs_due &&
      prevProps.word.fsrs_last_review === nextProps.word.fsrs_last_review &&
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning &&
      prevProps.word.root?.audio_url === nextProps.word.root?.audio_url
    );
  },
);

DictionaryWordCard.displayName = 'DictionaryWordCard';

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  cardContent: {
    minHeight: LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM,
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
    flex: 1, // Take available space
    paddingRight: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center', // Vertically center content
    alignItems: 'flex-start', // Keep left-aligned horizontally
    gap: LAYOUT.SPACING.TINY, // 4px gap between text and dot
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    textAlign: 'left',
    includeFontPadding: false,
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1),
  },
  memoryDot: {
    width: LAYOUT.SPACING.SMALL, // 8px
    height: LAYOUT.SPACING.SMALL, // 8px
    borderRadius: LAYOUT.SPACING.TINY, // 4px (circular)
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
  deleteButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: LAYOUT.SPACING.SMALL,
  },
});
