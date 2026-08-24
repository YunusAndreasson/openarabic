import { Ionicons } from '@/components/ui';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
// Gesture-handler's Pressable, NOT react-native's, for the action panels — see
// the note in WordListRow for the swipe/press negotiation this depends on.
import { Pressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { SortMeter } from '@/components/practice/SortMeter';
import { WordListRow } from '@/components/practice/WordListRow';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { DictionarySortField } from '@/hooks/vocabulary/useDictionaryList';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  getRecencyAccessibilityLabel,
  getSortMeterColorName,
  getSortMeterFraction,
} from '@/utils/dictionaryMeter';
import { getHorizonAccessibilityLabel, getMemoryHorizonDays } from '@/utils/memoryHorizon';
import { getRootLemma } from '@/utils/stringUtils';
import { DIFFICULTY_LABELS, getWordDifficultyLevel } from '@/utils/urgencyScore';

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
  /** Which magnitude the trailing meter draws — always the list's active sort. */
  sortField: DictionarySortField;
  /** One instant for the whole list, so every row's age meter shares a clock. */
  nowMs: number;
  /** Opens the word detail screen */
  onPress: (word: StudyWord) => void;
  /** Swipe action: remove the word from practice */
  onRemove: (word: StudyWord) => void;
  /** Swipe action: reset the word's FSRS progress */
  onResetProgress: (word: StudyWord) => void;
}

/**
 * One word in the dictionary index: `WordListRow` plus the two swipe actions and
 * the FSRS reads that decide what the row's single magnitude draws. The layout
 * itself — gloss leading, Arabic trailing, flat, ~55dp — lives in `WordListRow`,
 * which `/words-to-revisit` renders too.
 *
 * **Exactly one magnitude per row, and the sort control names it.** The meter
 * draws whatever the list is sorted by (see `getSortMeterFraction`), so the
 * control directly above the list is its label.
 *
 * A difficulty dot used to lead the row as a second, fixed signal. It was
 * removed once the meter became sort-bound, because it was then redundant
 * exactly where it was explained and unexplained everywhere else: under the
 * Difficulty sort colour and length encoded the same variable, and under
 * Strength and Recent it showed a quantity unrelated to the order with nothing
 * on screen naming it. Its original job — "sorting by Difficulty produces a
 * legible red-to-green column" — is now the meter's under that sort. Two
 * competing magnitudes where only one is labelled is worse than one that is.
 */
export const DictionaryWordRow = memo<DictionaryWordRowProps>(
  ({ word, sortField, nowMs, onPress, onRemove, onResetProgress }) => {
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

    const { arabicText, englishText } = useMemo(() => getRootLemma(word), [word]);

    const difficultyLevel = getWordDifficultyLevel(word);
    const difficultyLabel = DIFFICULTY_LABELS[difficultyLevel];
    const horizonDays = getMemoryHorizonDays(word);

    // Difficulty and horizon are true of the word whichever sort is active, so
    // they are always spoken even though only one of them is ever drawn:
    // trimming this to match the visual would take information away from screen
    // reader users to make them equal with everyone else.
    //
    // Age is the exception, and it goes the other way. It says nothing about the
    // word — only about where the list has put it — so it is announced exactly
    // while it is the magnitude the meter is drawing.
    const accessibilityLabel = [
      arabicText,
      englishText,
      difficultyLabel,
      getHorizonAccessibilityLabel(horizonDays),
      sortField === 'recent' ? getRecencyAccessibilityLabel(word, nowMs) : null,
    ]
      .filter(Boolean)
      .join(', ');

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
        <WordListRow
          accessibilityLabel={accessibilityLabel}
          arabic={arabicText}
          gloss={englishText}
          trailing={
            <SortMeter
              fraction={getSortMeterFraction(word, sortField, nowMs)}
              colorName={getSortMeterColorName(word, sortField)}
            />
          }
          onPress={handlePress}
        />
      </ReanimatedSwipeable>
    );
  },
  (prevProps, nextProps) => {
    // Only compare values actually used in render output — the screen passes
    // stable callback references. Anything new rendered here must be added, or
    // it silently keeps the previous word's value after a recycle.
    //
    // `fsrs_state` and `fsrs_reps` are here because `hasBeenPractised` reads
    // them, and both the dot and the meter gate on it. They were missing while
    // the dot already depended on them, so a recycled row could carry the
    // previous word's practised/new verdict — an amber "Moderate" dot on a word
    // never reviewed. `created_at` and `nowMs` feed the age meter under the
    // Recent sort, and `sortField` decides which magnitude the meter draws at
    // all: without it, changing the sort reorders the rows and leaves every
    // meter at its previous length.
    return (
      prevProps.sortField === nextProps.sortField &&
      prevProps.nowMs === nextProps.nowMs &&
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_difficulty === nextProps.word.fsrs_difficulty &&
      prevProps.word.fsrs_stability === nextProps.word.fsrs_stability &&
      prevProps.word.fsrs_state === nextProps.word.fsrs_state &&
      prevProps.word.fsrs_reps === nextProps.word.fsrs_reps &&
      prevProps.word.created_at === nextProps.word.created_at &&
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
