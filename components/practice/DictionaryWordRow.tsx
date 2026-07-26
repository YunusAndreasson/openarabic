import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui';

import { LAYOUT, MIN_TOUCH_TARGET, STATUS_INDICATOR } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getDifficultyLevel } from '@/utils/urgencyScore';

const CHEVRON_SIZE = 14;

interface DictionaryWordRowProps {
  word: StudyWord;
  /** Opens the word detail screen */
  onPress: (word: StudyWord) => void;
  /** Swipe action: remove the word from practice */
  onRemove: (word: StudyWord) => void;
  /** Swipe action: reset the word's FSRS progress */
  onResetProgress: (word: StudyWord) => void;
}

/**
 * One word in the dictionary index — a difficulty dot, the Arabic, then the
 * meaning trailing, split from its neighbours by the list's hairline separator.
 *
 * Deliberately flat: an index of hundreds of words should read as a list, not
 * as a stack of elevated cards.
 *
 * The dot sits in a fixed-width leading column so it forms one vertical axis to
 * scan. Sorted by Difficulty (the default) the column reads as a gradient, so
 * the indicator and the sort order corroborate each other. Its level, label and
 * color come from `getDifficultyLevel` — the same source the word detail
 * screen's Difficulty stat uses, so the two surfaces can't drift apart.
 */
export const DictionaryWordRow = memo<DictionaryWordRowProps>(
  ({ word, onPress, onRemove, onResetProgress }) => {
    const colors = useColors();
    const swipeableRef = useRef<SwipeableMethods>(null);

    // FlashList recycles row instances onto new words — snap any open action
    // panel shut instantly so it can't carry over to the recycled row.
    useEffect(() => {
      swipeableRef.current?.reset();
    }, [word.root_id]);

    const handlePress = useCallback(() => {
      onPress(word);
    }, [onPress, word]);

    const handleRemove = useCallback(() => {
      swipeableRef.current?.close();
      onRemove(word);
    }, [onRemove, word]);

    const handleResetProgress = useCallback(() => {
      swipeableRef.current?.close();
      onResetProgress(word);
    }, [onResetProgress, word]);

    const renderRightActions = useCallback(
      () => (
        <View style={styles.actions}>
          <IconButton
            icon="refresh"
            onPress={handleResetProgress}
            backgroundColor={colors.warning}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            accessibilityLabel={STRINGS.RESET_PROGRESS_ACTION}
          />
          <IconButton
            icon="trash"
            onPress={handleRemove}
            variant="danger"
            iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            accessibilityLabel={STRINGS.REMOVE_FROM_PRACTICE_ACTION}
          />
        </View>
      ),
      [handleResetProgress, handleRemove, colors.warning],
    );

    // A flat row has no card press-scale, so feedback comes from the surface:
    // an Android ripple plus a pressed background on both platforms.
    const rippleConfig = useMemo(
      () => ({ color: colors.navigationRipple, borderless: false, foreground: true }),
      [colors.navigationRipple],
    );

    const pressableStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        styles.row,
        pressed && { backgroundColor: colors.elevation2 },
      ],
      [colors.elevation2],
    );

    const arabicText = word.root?.letters ?? '';
    const englishText = useMemo(
      () => capitalizeFirstLetter(word.root?.meaning ?? ''),
      [word.root?.meaning],
    );

    const difficultyLevel = getDifficultyLevel(word.fsrs_difficulty);
    const difficultyLabel = DIFFICULTY_LABELS[difficultyLevel];

    return (
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
        containerStyle={styles.container}
      >
        <Pressable
          onPress={handlePress}
          android_ripple={rippleConfig}
          style={pressableStyle}
          // The dot is color-only, so the level is spelled out here — screen
          // reader users and anyone who can't separate the hues get it too
          accessibilityLabel={`${arabicText}, ${englishText}, ${difficultyLabel}`}
        >
          <View
            style={[
              styles.difficultyDot,
              { backgroundColor: colors[DIFFICULTY_COLORS[difficultyLevel]] },
            ]}
          />
          <ThemedText type="arabicCompact" align="left" numberOfLines={1} style={styles.arabicText}>
            {arabicText}
          </ThemedText>
          <ThemedText
            type="caption"
            colorName="secondaryText"
            align="right"
            numberOfLines={1}
            style={styles.englishText}
          >
            {englishText}
          </ThemedText>
          <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.textTertiary} />
        </Pressable>
      </ReanimatedSwipeable>
    );
  },
  (prevProps, nextProps) => {
    // Only compare values actually used in render output — the screen passes
    // stable callback references. Anything new rendered here must be added.
    return (
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty &&
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning
    );
  },
);

DictionaryWordRow.displayName = 'DictionaryWordRow';

const styles = StyleSheet.create({
  container: {
    // Keeps the pressed background and ripple inside the row's bounds
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    // Floor for very small Arabic font settings — also stops the 44px swipe
    // action buttons from dictating the row height
    minHeight: MIN_TOUCH_TARGET.LARGE,
  },
  difficultyDot: {
    width: STATUS_INDICATOR.DOT_SIZE,
    height: STATUS_INDICATOR.DOT_SIZE,
    borderRadius: STATUS_INDICATOR.DOT_RADIUS,
    // Never shrink — the dots must stay on one vertical axis to be scannable
    flexShrink: 0,
  },
  arabicText: {
    flexShrink: 1,
  },
  englishText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.MEDIUM,
  },
});
