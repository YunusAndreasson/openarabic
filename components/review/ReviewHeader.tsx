import { GlassIconButton } from '@/components/ui';
import { ProgressBar } from '@/components/common';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { mixColors } from '@/utils/colorUtils';
import { lightFeedback } from '@/utils/haptics';

// The mic and close controls are `GlassIconButton`s, which are 44pt — the Apple
// HIG minimum tap target (Material prefers 48dp). The visible button matches the
// touch target, so no hitSlop is needed and adjacent hit areas can't overlap.

/** The preparing state has nothing to toggle; GlassIconButton requires onPress. */
const NOOP = (): undefined => undefined;

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
  /** Render the mic slot at all. Kept separate from `voiceDormant` so a screen
   *  that has no voice concept can still omit it entirely. */
  showVoiceControl?: boolean;
  /** Voice grading is off, so the mic is an offer rather than a mute: it opens
   *  `onOfferVoice` instead of toggling anything. The slot stays occupied so
   *  the feature leaves a trace on the one screen where speaking is the natural
   *  act — without it, a learner who never finishes a session never learns the
   *  feature exists. */
  voiceDormant?: boolean;
  /** Open the speak-the-answer offer. Without it the slot stays empty, since a
   *  mic that does nothing is worse than no mic. Required when `voiceDormant`. */
  onOfferVoice?: () => void;
  /** Voice is enabled but the model is still downloading. The mute toggle would
   *  be a lie here — there is no recognizer to mute — so the slot shows a quiet
   *  preparing state instead. */
  voicePreparing?: boolean;
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
  /** Unique words answered this session (useSessionMetrics.wordsReviewed).
   *  Announced in the progress bar's accessible label only — the bar itself is
   *  the visual count, so there is no on-screen tally beside it. */
  wordsDone?: number;
}

export const ReviewHeader: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  onClose,
  showVoiceControl = false,
  voiceDormant = false,
  onOfferVoice,
  voicePreparing = false,
  voicePaused = false,
  voiceListening = false,
  onToggleVoice,
  recallRun = 0,
  wordsDone = 0,
}) => {
  const colors = useColors();

  const displayProgress = Math.max(progress, maxProgress);

  // One button, two jobs, chosen here so the chrome contract (clear glass,
  // selection haptic, spacing) is written once and the two states cannot drift.
  // `null` means the handler for this state was not supplied, which is the only
  // case where the slot is legitimately empty — rendering a mic that does
  // nothing would be worse than rendering none.
  //
  // Dormant: outline glyph, one step quieter than the live control. Present
  // enough to invite a tap, never loud enough to compete with the word being
  // recalled. Live: tint only while actively listening, neutral at rest so it
  // reads as the same chrome as the close button. `active` would also lift the
  // surface, which the mic shouldn't do — only the glyph changes colour.
  const voiceSlot = voiceDormant
    ? onOfferVoice && {
        label: STRINGS.VOICE_OFFER_LABEL,
        icon: 'mic-outline' as const,
        color: colors.textTertiary,
        onPress: onOfferVoice,
      }
    : voicePreparing
      ? {
          label: STRINGS.VOICE_PREPARING_LABEL,
          icon: 'mic-outline' as const,
          color: colors.textTertiary,
          onPress: NOOP,
        }
      : onToggleVoice && {
          label: voicePaused ? STRINGS.VOICE_RESUME_LABEL : STRINGS.VOICE_PAUSE_LABEL,
          icon: voicePaused ? ('mic-off' as const) : ('mic' as const),
          color: voiceListening ? colors.tint : colors.secondaryText,
          onPress: onToggleVoice,
        };

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
      {showVoiceControl && voiceSlot && (
        <GlassIconButton
          clear
          accessibilityLabel={voiceSlot.label}
          icon={voiceSlot.icon}
          iconColor={voiceSlot.color}
          hapticType="selection"
          style={STATIC_STYLES.voiceButtonSpacing}
          onPress={voiceSlot.onPress}
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
