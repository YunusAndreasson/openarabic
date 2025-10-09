import BaseCard from '@common/BaseCard';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';


import { ThemedText } from '@/components/ThemedText';
import DeleteButton from '@/components/bookmarks/DeleteButton';
import { StatusBadge } from '@/components/study/StatusBadge';
import { SPRING_CONFIG, WORD_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { generateAudioUrl } from '@/utils/imageUtils';
import {
  isDueWord,
  isExtraHardWord,
  isLearnedWord,
  isMasteredWord,
} from '@/utils/wordClassification';

interface DictionaryWordCardProps {
  word: StudyWord;
  editMode: boolean;
  onDelete: () => void;
}

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, editMode, onDelete }) => {
    const audioPlayer = useSimpleAudioPlayer();

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
        isExtraHard: isExtraHardWord(word),
      }),
      [word]
    );

    // Determine primary badge type (mutually exclusive: Due > Mastered > Learned)
    const primaryBadgeType = wordStatus.isDue
      ? 'due'
      : wordStatus.isMastered
        ? 'mastered'
        : wordStatus.isLearned
          ? 'learned'
          : null;

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
              {/* Left: Status badges and English text */}
              <View style={styles.leftSection}>
                <View style={styles.textContainer}>
                  {/* Status badges row (primary + optional extra hard) */}
                  {(primaryBadgeType || wordStatus.isExtraHard) && (
                    <View style={styles.badgesRow}>
                      {primaryBadgeType && <StatusBadge type={primaryBadgeType} />}
                      {wordStatus.isExtraHard && <StatusBadge type="extraHard" />}
                    </View>
                  )}

                  {/* English meaning text */}
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
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty && // Still needed for Extra Hard badge
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning &&
      prevProps.word.root?.audio_url === nextProps.word.root?.audio_url
    );
  }
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY, // Small gap between badges
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
  deleteButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: LAYOUT.SPACING.SMALL,
  },
});
