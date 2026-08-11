import { Ionicons } from '@/components/ui';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
// Gesture-handler's Pressable, NOT react-native's. RN's runs on the JS responder
// system, which does not negotiate with the swipeable's native pan: a horizontal
// drag stays inside the row's press rect, so the press was never cancelled and
// every swipe also fired onPress — the word detail opened on top of the actions
// the swipe had just revealed. This one is a gesture handler, so the pan
// activating cancels it the way it should.
import { Pressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';

import { Dot } from '@/components/common';
import { MemoryMeter } from '@/components/practice/MemoryMeter';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  getHorizonAccessibilityLabel,
  getHorizonFraction,
  getMemoryHorizonDays,
} from '@/utils/memoryHorizon';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getWordDifficultyLevel } from '@/utils/urgencyScore';

const CHEVRON_SIZE = 14;

/**
 * Horizontal travel before the swipe takes over, replacing the library's default
 * of 10px. At 10 the actions started following a finger that was really just
 * tapping or scrolling, so the row felt twitchy and half-opened constantly. 24
 * is past the slop of an ordinary tap while still well short of a deliberate
 * drag.
 */
const SWIPE_ACTIVATION_DISTANCE = 24;

/** Width of one action panel. Two of them make up the revealed area. */
const ACTION_WIDTH = 64;
const ACTIONS_WIDTH = ACTION_WIDTH * 2;
const ACTION_ICON_SIZE = 20;

interface RowActionsProps {
  /** Live drag offset from the swipeable — negative as the row moves left. */
  drag: SharedValue<number>;
  onReset: () => void;
  onRemove: () => void;
}

/**
 * The revealed swipe actions: two flush, full-height panels, no gaps and no
 * corners, the way a native iOS row action looks.
 *
 * Previously these were two circular icon buttons floating on the list
 * background, laid out statically — `renderRightActions` ignored the drag, so
 * the panel did not track the finger and the buttons appeared to lag and stretch
 * as the row moved. Reading `drag` and translating by it pins the actions to the
 * row edge for the whole gesture, which is the difference between "revealed" and
 * "sliding around".
 */
function RowActions({ drag, onReset, onRemove }: RowActionsProps) {
  const colors = useColors();

  const animatedStyle = useAnimatedStyle(() => ({
    // `drag` is 0 at rest and -ACTIONS_WIDTH when fully open, so this holds the
    // panel exactly against the row's trailing edge at every point of the drag.
    transform: [{ translateX: drag.value + ACTIONS_WIDTH }],
  }));

  return (
    <Animated.View style={[styles.actions, animatedStyle]}>
      <Pressable
        onPress={onReset}
        style={[styles.action, { backgroundColor: colors.warning }]}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.RESET_PROGRESS_ACTION}
      >
        <Ionicons name="refresh" size={ACTION_ICON_SIZE} color={colors.onTint} />
      </Pressable>
      <Pressable
        onPress={onRemove}
        style={[styles.action, { backgroundColor: colors.error }]}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.REMOVE_FROM_PRACTICE_ACTION}
      >
        <Ionicons name="trash" size={ACTION_ICON_SIZE} color={colors.onTint} />
      </Pressable>
    </Animated.View>
  );
}

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
 * color come from `getWordDifficultyLevel` — the same source the word detail
 * screen's Difficulty stat uses, so the two surfaces can't drift apart.
 *
 * The trailing meter is the same idea for the other magnitude the list sorts by:
 * colour carries difficulty, length carries how far the memory reaches. Both are
 * fixed in meaning — neither changes with the active sort — so nothing here is a
 * mode, and each ordering has exactly one signal that corroborates it.
 */
export const DictionaryWordRow = memo<DictionaryWordRowProps>(
  ({ word, onPress, onRemove, onResetProgress }) => {
    const colors = useColors();
    const swipeableRef = useRef<SwipeableMethods>(null);
    // Set the moment a drag starts revealing the actions. Belt and braces behind
    // the gesture negotiation: whatever the handlers decide between them, a row
    // the learner is swiping must not also navigate away.
    const draggingRef = useRef(false);

    // FlashList recycles row instances onto new words — snap any open action
    // panel shut instantly so it can't carry over to the recycled row.
    useEffect(() => {
      swipeableRef.current?.reset();
      draggingRef.current = false;
    }, [word.root_id]);

    const handleOpenStartDrag = useCallback(() => {
      draggingRef.current = true;
    }, []);

    const handleClose = useCallback(() => {
      draggingRef.current = false;
    }, []);

    const handlePress = useCallback(() => {
      if (draggingRef.current) return;
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
      (_progress: SharedValue<number>, drag: SharedValue<number>) => (
        <RowActions drag={drag} onReset={handleResetProgress} onRemove={handleRemove} />
      ),
      [handleResetProgress, handleRemove],
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

    const difficultyLevel = getWordDifficultyLevel(word);
    const difficultyLabel = DIFFICULTY_LABELS[difficultyLevel];
    const horizonDays = getMemoryHorizonDays(word);

    return (
      <ReanimatedSwipeable
        ref={swipeableRef}
        // 1:1 with the finger. At friction 2 the row moved half as far as the
        // drag, so opening the 128px panel took 256px of travel and the whole
        // gesture felt heavy and detached from the touch.
        friction={1}
        // Past halfway to open, snap back below it.
        rightThreshold={ACTION_WIDTH}
        overshootRight={false}
        dragOffsetFromRightEdge={SWIPE_ACTIVATION_DISTANCE}
        onSwipeableOpenStartDrag={handleOpenStartDrag}
        onSwipeableClose={handleClose}
        renderRightActions={renderRightActions}
        containerStyle={styles.container}
      >
        <Pressable
          onPress={handlePress}
          android_ripple={rippleConfig}
          style={pressableStyle}
          // The dot is color-only and the meter is length-only, so both are
          // spelled out here — screen reader users, and anyone who can't
          // separate the hues, get the same two readings everyone else does.
          accessibilityLabel={`${arabicText}, ${englishText}, ${difficultyLabel}, ${getHorizonAccessibilityLabel(horizonDays)}`}
        >
          <Dot color={colors[DIFFICULTY_COLORS[difficultyLevel]]} />
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
          {/* Meter and chevron travel together on a tighter gap: they are one
              trailing accessory, and a full gap between them would cost the
              meaning another 12dp of width. */}
          <View style={styles.trailing}>
            <MemoryMeter fraction={getHorizonFraction(horizonDays)} />
            <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.textTertiary} />
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    );
  },
  (prevProps, nextProps) => {
    // Only compare values actually used in render output — the screen passes
    // stable callback references. Anything new rendered here must be added, or
    // it silently keeps the previous word's value after a recycle.
    return (
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty &&
      prevProps.word.fsrs_stability === nextProps.word.fsrs_stability &&
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
  arabicText: {
    flexShrink: 1,
  },
  englishText: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    // No gap, no padding, no radius: the panels sit flush against each other and
    // against the row, and stretch the row's full height.
    width: ACTIONS_WIDTH,
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
