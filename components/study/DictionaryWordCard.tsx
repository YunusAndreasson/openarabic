import { BaseCard } from '@common/BaseCard';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { DeleteButton } from '@/components/bookmarks/DeleteButton';
import { SPRING_CONFIG, WORD_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT, STATUS_INDICATOR } from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { isDueWord, isLearnedWord, isMasteredWord } from '@/utils/wordClassification';

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

    // Transform animation for edit mode (similar to bookmarks)
    const { animatedStyle, setValue } = useTransformAnimation({
      type: 'scale',
      initialValue: 1,
      targetValue: 1,
      useSpring: true,
      damping: SPRING_CONFIG.RESPONSIVE.damping,
      stiffness: SPRING_CONFIG.RESPONSIVE.stiffness,
    });

    // Apply edit mode scaling
    if (editMode) {
      setValue(WORD_PRESS_SCALE);
    } else {
      setValue(1);
    }

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
    const englishText = word.root?.meaning || 'Unknown English';

    // Determine word status for badges (memoized to prevent recalculations)
    const wordStatus = useMemo(
      () => ({
        isDue: isDueWord(word),
        isLearned: isLearnedWord(word),
        isMastered: isMasteredWord(word),
      }),
      [word],
    );

    // Determine status colors for dots and background (memoized for performance)
    const statusColors = useMemo(() => {
      const dotColors: string[] = [];

      // Add Due status color (red - urgent attention)
      if (wordStatus.isDue) {
        dotColors.push(colors.error);
      }

      // Add Mastered or Learned status color
      if (wordStatus.isMastered) {
        dotColors.push(colors.success); // Green - completed achievement
      } else if (wordStatus.isLearned) {
        dotColors.push(colors.warning); // Yellow/amber - in progress
      }

      return dotColors;
    }, [
      wordStatus.isDue,
      wordStatus.isLearned,
      wordStatus.isMastered,
      colors.error,
      colors.success,
      colors.warning,
    ]);

    // Subtle background tint for ambient status awareness (5% opacity)
    const cardBackgroundTint = useMemo(() => {
      if (statusColors.length === 0) return undefined;
      return statusColors[0] + '0D'; // Append 0D for ~5% opacity
    }, [statusColors]);

    return (
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        <View style={styles.cardWrapper}>
          <BaseCard
            style={[styles.card, cardBackgroundTint && { backgroundColor: cardBackgroundTint }]}
            onPress={editMode ? undefined : handleCardPress}
            shadowSize="small"
            contentStyle={styles.cardContent}
          >
            <View style={styles.content}>
              {/* Status dots - left indicator for visual hierarchy */}
              {statusColors.length > 0 && (
                <View style={styles.dotsContainer}>
                  {statusColors.map(color => (
                    <View key={color} style={[styles.statusDot, { backgroundColor: color }]} />
                  ))}
                </View>
              )}

              {/* English text (vertically centered) */}
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
    width: LAYOUT.CARD.WIDTH.DICTIONARY_LEFT_SECTION,
    flexShrink: 0,
    paddingRight: LAYOUT.SPACING.SMALL,
    justifyContent: 'center', // Vertically center English text
    alignItems: 'flex-start', // Keep left-aligned horizontally
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    textAlign: 'left',
    includeFontPadding: false,
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1),
  },
  dotsContainer: {
    flexDirection: 'column', // Vertical stack of dots
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.TINY, // 4px gap between dots
    marginRight: LAYOUT.SPACING.SMALL, // 8px gap before English text
  },
  statusDot: {
    width: STATUS_INDICATOR.DOT_SIZE,
    height: STATUS_INDICATOR.DOT_SIZE,
    borderRadius: STATUS_INDICATOR.DOT_RADIUS,
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
