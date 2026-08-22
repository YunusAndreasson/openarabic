/**
 * The voice half of the card's action row: "Speak to answer" on the right,
 * "Show answer" on the left, one line of text each, same rounded-rect shape.
 * The two used to differ only by tint (a muted chip either way); now this one
 * goes solid — the row's one loud action — while "Show answer" stays a
 * quiet, neutral chip beside it. Shape stays shared between the two;
 * `standalone={false}` keeps this one off the app's pill-CTA shape, which is
 * reserved for "Show answer" when it has no peer to share a row with. See
 * ReviewActionButton on why the loud/quiet split is safe here (it is not an
 * outcome row) where it would not be on the grade bar or voice-result row.
 *
 * This button used to be the whole voice channel — a mic glyph that grew into a
 * live meter above a label that cycled through seven strings ("Preparing
 * voice…", "Listen…", "Opening mic…", "Listening…", "Grading…", "Voice
 * paused", "Microphone is off"). It reported the pipeline. That made it two
 * rows tall next to a one-row "Show answer", so the pair never read as two ways
 * to do the same thing, and it meant the one control the learner had to aim at
 * changed its name and height under their finger.
 *
 * State moved to the card (VoiceListeningIndicator). What is left here is the
 * action, which only ever has two values:
 *
 *   tap while idle       → open the mic (stops the prompt if it is still running)
 *   tap while listening  → done speaking, grade it
 *
 * The energy gate still ends a recording on its own, so "Done" is an option
 * rather than an obligation — which is why it no longer needs the "Tap when
 * you're done" line that used to sit above the row explaining it.
 *
 * It is also the only thing that opens the mic on a fresh card. (`retry()` from
 * the voice-result panel re-opens it on a card already answered, and the
 * transient-failure backoff finishes a request this button started — see
 * `armRequestedRef` in useVoiceReview; neither is a new invitation to speak.)
 * The review header used to carry a mute toggle beside the close button; with
 * arming driven from here, not tapping is the mute, and the toggle was a second
 * control for a decision this one already expresses.
 */
import type { FC } from 'react';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

/**
 * What the button offers right now.
 *
 * `ready`  — tap to open the mic. Also the state while the Arabic prompt is
 *            still playing: being ready early is a good thing, and the tap cuts
 *            the clip short rather than queueing behind it.
 * `live`   — the mic is capturing; tap to end it.
 * `busy`   — the mic is opening or the answer is being graded. Nothing to press;
 *            the card's meter says what is going on.
 */
export type VoiceButtonMode = 'ready' | 'live' | 'busy';

/**
 * `null` means don't render the button at all.
 *
 * A refused microphone and a model that is still downloading both used to put
 * their own label in this slot, so the primary control on the screen spent its
 * time apologising. An offer that isn't there needs no excuse: "Show answer"
 * simply takes the row.
 *
 * There is no paused state to check any more. Muting was a header toggle back
 * when the mic armed itself on every card; now nothing opens it but this
 * button, so declining to tap it IS the mute.
 *
 * `ready` is `VoiceGradingProvider.isReady`, and it is checked HERE rather than
 * by the caller because the phase alone cannot answer the question. On a model
 * load error the recognizer is neither ready nor loading, so useVoiceReview's
 * phase effect settles on 'idle' — which every rule below reads as "invite the
 * answer". That rendered a full "Speak to answer" whose tap fired a haptic and
 * then died on speakNow's own `!voice.isReady` guard: a dead control on every
 * card of the session, with nothing on screen saying why. A mic that cannot
 * open is not an offer.
 */
export function voiceButtonMode(phase: VoicePhase, ready: boolean): VoiceButtonMode | null {
  if (!ready) return null;
  switch (phase) {
    case 'loading':
    case 'denied':
      return null;
    case 'listening':
      return 'live';
    case 'arming':
    case 'checking':
      return 'busy';
    default:
      return 'ready';
  }
}

interface VoiceAnswerButtonProps {
  mode: VoiceButtonMode;
  /** Open the mic now. Stops the prompt on its way in, so a learner who is
   *  ready before the clip ends does not have to sit through it. */
  onSpeakNow: () => void;
  /** Done speaking: close the mic and grade what was captured. */
  onStopSpeaking: () => void;
}

export const VoiceAnswerButton: FC<VoiceAnswerButtonProps> = ({
  mode,
  onSpeakNow,
  onStopSpeaking,
}) => {
  const colors = useColors();
  const isLive = mode === 'live';

  // One target, two meanings, decided by what the mic is doing: open it, or —
  // once it is genuinely capturing — close it. There is no hold gesture. Hold
  // used to share this target with the tap, so a deliberate press that ran a
  // shade long became a hold, and its release graded a recording the learner
  // thought they were still starting.
  //
  // Both meanings acknowledge the tap itself, nothing more. Opening the mic is
  // a request, not a result — the tick that says "go" belongs to the moment the
  // microphone is actually capturing, half a second to a second later
  // (useVoiceReview's onCapturing). The two are a deliberate two-beat, "heard
  // you" then "go", far enough apart to read as separate events rather than as
  // one double-buzz.
  const handlePress = useCallback(() => {
    selectionFeedback();
    if (isLive) {
      onStopSpeaking();
      return;
    }
    onSpeakNow();
  }, [isLive, onSpeakNow, onStopSpeaking]);

  // `busy` outlasts an eyeblink — grading takes about a second — so unlike the
  // card-advance disable it has to be visible, or the learner taps a live-
  // looking button and nothing happens. State-driven, so it rides a CSS
  // transition per the house split, and it stands the button down rather than
  // giving it a fourth label to say so.
  const standDown = mode === 'busy';

  return (
    <Animated.View
      style={[
        STATIC_STYLES.slot,
        {
          opacity: standDown ? LAYOUT.OPACITY.MEDIUM : LAYOUT.OPACITY.FULL,
          transitionProperty: 'opacity',
          transitionDuration: TIMING_CONFIG.FAST.duration,
        },
      ]}
    >
      <ReviewActionButton
        label={isLive ? STRINGS.VOICE_DONE_SPEAKING : STRINGS.VOICE_SPEAK_TO_ANSWER}
        accessibilityLabel={isLive ? STRINGS.VOICE_DONE_SPEAKING : STRINGS.VOICE_CHANNEL_LABEL}
        color={colors.tint}
        variant="primary"
        standalone={false}
        disabled={standDown}
        onPress={handlePress}
      />
    </Animated.View>
  );
};

// ReviewActionButton is `flex: 1`, so the wrapper has to carry the share of the
// row the button would otherwise claim for itself.
const STATIC_STYLES = StyleSheet.create({
  slot: {
    flex: 1,
    flexDirection: 'row',
  },
});

VoiceAnswerButton.displayName = 'VoiceAnswerButton';
