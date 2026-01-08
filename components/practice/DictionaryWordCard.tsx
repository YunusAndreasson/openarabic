import { BaseCard } from '@/components/common';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { DeleteButton } from '@/components/playlist';
import { ColorDot } from '@/components/ui/ColorDot';
import { FONT_WEIGHTS, LAYOUT } from '@/constants/layout';
import { useEditModeCardAnimation } from '@/hooks/cards';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { getStabilityProgressColor } from '@/utils/urgencyScore';

interface DictionaryWordCardProps {
  word: StudyWord;
  editMode: boolean;
  onDelete: () => void;
  /** Called when card is pressed (opens sentence examples bottom sheet) */
  onPress?: (word: StudyWord) => void;
}

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, editMode, onDelete, onPress }) => {
    const colors = useColors();

    // Edit mode animation (scales down when in edit mode)
    const { animatedStyle } = useEditModeCardAnimation({ editMode });

    // Handle card press - opens sentence examples bottom sheet
    const handleCardPress = useCallback(() => {
      if (editMode) return;
      onPress?.(word);
    }, [editMode, word, onPress]);

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
              {/* Memory dot and English text */}
              <View style={styles.leftSection}>
                <ColorDot color={colors[dotColorKey]} />
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
    // Only compare values actually used in render output
    return (
      prevProps.editMode === nextProps.editMode &&
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_stability === nextProps.word.fsrs_stability &&
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    textAlign: 'left',
    includeFontPadding: false,
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1),
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
