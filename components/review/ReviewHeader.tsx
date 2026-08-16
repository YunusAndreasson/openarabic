import { GlassIconButton } from '@/components/ui';
import { ProgressBar } from '@/components/common';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { mixColors } from '@/utils/colorUtils';
import { lightFeedback } from '@/utils/haptics';

// The mic and close controls are `GlassIconButton`s, which are 44pt — the Apple
// HIG minimum tap target (Material prefers 48dp). The visible button matches the
// touch target, so no hitSlop is needed and adjacent hit areas can't overlap.

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
    height: MIN_TOUCH_TARGET.MEDIUM, // 44px - fits the tap-target-sized icon buttons
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  progressContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.LARGE,
  },
  doneContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  runContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  voiceButtonSpacing: {
    marginRight: LAYOUT.SPACING.MEDIUM, // 12px gap ≥ Material's 8dp min between targets
  },
});

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  onClose?: () => void;
  /** Show the voice mute toggle (only when voice grading is enabled). */
  showVoiceControl?: boolean;
  /** True when auto-listen is muted for this session — drives the mic glyph. */
  voicePaused?: boolean;
  /** True only while the mic is actively listening — tints the mic icon so the
   *  brand color reads as a live "listening now" cue. At rest the mic stays the
   *  same neutral color as the close button. */
  voiceListening?: boolean;
  /** Toggle the session-local voice mute. */
  onToggleVoice?: () => void;
  /** Consecutive recalls this session (useSessionMetrics.currentStreak). */
  recallRun?: number;
  /** Unique words answered this session (useSessionMetrics.wordsReviewed). */
  wordsDone?: number;
}

export const ReviewHeader: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  onClose,
  showVoiceControl = false,
  voicePaused = false,
  voiceListening = false,
  onToggleVoice,
  recallRun = 0,
  wordsDone = 0,
}) => {
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
  // Both chrome buttons pass hapticType="selection" explicitly, overriding
  // GlassIconButton's 'light' default — tier 0 in utils/haptics. Leaving the
  // session and muting the mic are navigation, and a session where the chrome
  // buzzes as hard as a grade has no room left to mark the grade.
  const handleClose = () => {
    onClose?.();
  };

  return (
    <View style={STATIC_STYLES.header}>
      {/* The cumulative count, left of the bar and permanent; the run counter on
          the right is the transient one. Two different questions — how much have
          I done, and how is it going right now — so they get two places rather
          than taking turns in one. It carries the session past the point where
          the bar can: the bar measures a sitting and pins full at the end of it,
          and on a large backlog the learner keeps going well beyond that. */}
      {wordsDone > 0 && (
        <View style={STATIC_STYLES.doneContainer}>
          <ThemedText type="caption" colorName="secondaryText" numberOfLines={1}>
            {STRINGS.SESSION_WORDS_DONE(wordsDone)}
          </ThemedText>
        </View>
      )}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={STRINGS.SESSION_PROGRESS_A11Y(Math.round(displayProgress), wordsDone)}
        style={STATIC_STYLES.progressContainer}
      >
        {/* Deliberately thinner than the ProgressBar default (12): next to two
            44pt circular buttons a 12px pill reads as a third control rather
            than as chrome. */}
        <ProgressBar
          animationDuration={TIMING_CONFIG.PROGRESS.duration}
          progress={displayProgress}
          height={LAYOUT.SPACING.SMALL}
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
      {showVoiceControl && onToggleVoice && (
        <GlassIconButton
          clear
          accessibilityLabel={voicePaused ? STRINGS.VOICE_RESUME_LABEL : STRINGS.VOICE_PAUSE_LABEL}
          icon={voicePaused ? 'mic-off' : 'mic'}
          // Tint only while actively listening; neutral at rest so it reads as
          // the same chrome control as the close button. `active` would also
          // lift the surface, which the mic shouldn't do — only the glyph
          // changes colour.
          iconColor={voiceListening ? colors.tint : colors.secondaryText}
          hapticType="selection"
          style={STATIC_STYLES.voiceButtonSpacing}
          onPress={onToggleVoice}
        />
      )}
      {onClose && (
        <GlassIconButton
          clear
          accessibilityLabel={STRINGS.REVIEW_CLOSE_A11Y}
          icon="close"
          hapticType="selection"
          onPress={handleClose}
        />
      )}
    </View>
  );
};

ReviewHeader.displayName = 'ReviewHeader';
