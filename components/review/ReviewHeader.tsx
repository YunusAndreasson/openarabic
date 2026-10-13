import { Ionicons } from '@/components/ui';
import { ProgressBar } from '@/components/common';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { mixColors } from '@/utils/colorUtils';
import { lightFeedback } from '@/utils/haptics';

// Close is a bare glyph in a 44pt box — the Apple HIG minimum tap target
// (Material prefers 48dp) — so the box needs no hitSlop and paints nothing.
//
// It used to be a `GlassIconButton`: a filled 44pt circle. Beside a thin
// progress bar that made the exit the heaviest thing in the header, on a screen
// whose subject is the card below it. The reference this follows (edenmind's
// review screen) draws the same control as an X and nothing else.
//
// It is the only control up here. The header used to carry a mic beside it,
// wearing three hats at once — a session mute, a "still downloading" notice and
// a dormant offer that opened the voice pitch — none of which the learner had
// asked for at the moment they were trying to recall a word. Voice is now
// entirely a bottom-band act: "Speak to answer" opens the mic when it is
// tapped, and not tapping it is the mute. Nothing was left for a second glyph
// to say, so the chrome is a progress bar, an occasional run counter, and the
// way out.

/** Tint mixed into the elevation surface to make the progress track visible. */
const TRACK_TINT = 0.15;

/** Below this a "run" is noise — two right answers is just Tuesday. */
const MIN_RECALL_RUN = 3;

/**
 * How often a run gets a haptic after the first one. The counter itself updates
 * on every correct card, but buzzing each time turns a reward into wallpaper —
 * and it would land right behind the grade haptic that caused it. Marking the
 * run's arrival and then every fifth keeps it an event.
 */
const RECALL_RUN_HAPTIC_INTERVAL = 5;

/** Whether this run length is one worth feeling, not just seeing. */
const isRecallRunMilestone = (run: number): boolean =>
  run === MIN_RECALL_RUN ||
  (run > MIN_RECALL_RUN && (run - MIN_RECALL_RUN) % RECALL_RUN_HAPTIC_INTERVAL === 0);

const STATIC_STYLES = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: MIN_TOUCH_TARGET.MEDIUM, // 44px - fits the tap-target-sized close box
    // The screen's frame: the same inset as the card and the action band in
    // app/review.tsx, so the bar starts on the card's left edge and the close
    // box ends on its right.
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  progressContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.LARGE,
  },
  runContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  close: {
    alignItems: 'center',
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
  closePressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
});

/** Progress track thickness. Thin enough to read as chrome beside a bare glyph. */
const PROGRESS_HEIGHT = LAYOUT.SPACING.SMALL - LAYOUT.SPACING.HALF_TINY; // 6

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  onClose?: () => void;
  /** Consecutive recalls this session (useSessionMetrics.currentStreak). */
  recallRun?: number;
  /** Unique words answered this session (useSessionMetrics.wordsReviewed).
   *  Announced in the progress bar's accessible label only — the bar itself is
   *  the visual count, so there is no on-screen tally beside it. */
  wordsDone?: number;
}

export const ReviewHeader = ({
  progress,
  maxProgress,
  onClose,
  recallRun = 0,
  wordsDone = 0,
}: ReviewHeaderProps) => {
  const colors = useColors();

  const displayProgress = Math.max(progress, maxProgress);

  // A run is the one moment in the session that rewards the learner while they
  // are still in it, and it was visual-only — a caption fading in beside a
  // progress bar nobody is looking at mid-answer. The tick lands 100–300ms
  // after the grade haptic (the metrics update runs behind the FSRS write), so
  // it reads as a distinct second beat — "right… and that's three in a row" —
  // rather than smearing into the grade.
  //
  // Keyed off a rising edge rather than the render, so a remount mid-session
  // doesn't re-congratulate a run the learner already felt.
  const lastRunRef = useRef(recallRun);
  useEffect(() => {
    const previous = lastRunRef.current;
    lastRunRef.current = recallRun;
    if (recallRun > previous && isRecallRunMilestone(recallRun)) {
      lightFeedback();
    }
  }, [recallRun]);

  // The close haptic lives on the button rather than in useReview's handleClose:
  // that exit is also reached from the completion screen's ThemedButtons, which
  // fire their own, so keeping it in the hook buzzed Continue twice in one tick.
  //
  // `selection` is tier 0 in utils/haptics. Leaving the session is navigation,
  // and a session where the chrome buzzes as hard as a grade has no room left
  // to mark the grade.
  //
  // No scale on press, the same call `HeaderIconButton` makes: a control that
  // shrinks inside the header reads as loose. Pressed opacity and the Android
  // ripple answer the tap.
  const { handlePress: handleClose, rippleConfig } = useButtonPress({
    onPress: () => onClose?.(),
    hapticType: 'selection',
  });

  return (
    <View style={STATIC_STYLES.header}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={STRINGS.SESSION_PROGRESS_A11Y(Math.round(displayProgress), wordsDone)}
        style={STATIC_STYLES.progressContainer}
      >
        {/* Deliberately thinner than the ProgressBar default (12), which beside
            a bare glyph would be the header's loudest element and read as a
            control rather than as chrome. */}
        <ProgressBar
          animationDuration={TIMING_CONFIG.PROGRESS.duration}
          progress={displayProgress}
          height={PROGRESS_HEIGHT}
          // The default track is tint at 15%, which over this screen's near-black
          // background is within a shade of the page — so on the first card, when
          // the fill is still zero-width, the bar was invisible and the session
          // opened with a header that looked empty. A mixed track is a real
          // channel the fill visibly travels along, in both themes.
          backgroundColor={mixColors(colors.elevation2, colors.tint, TRACK_TINT)}
        />
      </View>
      {/* A quiet run counter, from metrics the session already tracks. All the
          reward in this loop used to be deferred to the completion screen, so a
          good run felt like nothing until it was over. Appears only once the
          run is worth noticing and re-enters on each new milestone (keyed), so
          it reads as a nod rather than a scoreboard. No confetti, no glow. */}
      {recallRun >= MIN_RECALL_RUN && (
        <Animated.View
          key={recallRun}
          entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
          exiting={FadeOut.duration(TIMING_CONFIG.FAST.duration)}
          style={STATIC_STYLES.runContainer}
        >
          <ThemedText type="caption" colorName="success" numberOfLines={1}>
            {STRINGS.RECALL_RUN(recallRun)}
          </ThemedText>
        </Animated.View>
      )}
      {onClose && (
        <Pressable
          accessibilityLabel={STRINGS.REVIEW_CLOSE_A11Y}
          accessibilityRole="button"
          android_ripple={rippleConfig}
          style={({ pressed }) => [STATIC_STYLES.close, pressed && STATIC_STYLES.closePressed]}
          onPress={handleClose}
        >
          <Ionicons
            color={colors.secondaryText}
            // The outline cut: Ionicons' plain `close` is the filled, heavy-stroke
            // variant, which without a circle around it reads as a bold mark.
            name="close-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
          />
        </Pressable>
      )}
    </View>
  );
};

ReviewHeader.displayName = 'ReviewHeader';
