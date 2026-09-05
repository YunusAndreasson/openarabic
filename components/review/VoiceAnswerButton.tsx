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
import type { VoiceReadiness } from '@/utils/voiceReadiness';

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
export type VoiceButtonMode =
  | 'ready'
  | 'live'
  | 'busy'
  /** Model still downloading, or the engine still building. Disabled, but it
   *  says so — this is the state that used to render nothing at all. */
  | 'preparing'
  /** Wanted, but the download is holding out for an unmetered connection.
   *  Tapping offers the cellular opt-in. */
  | 'waiting-network'
  /** The OS refused the mic. Tapping opens system settings. */
  | 'mic-denied';

/**
 * `null` means don't render the button at all.
 *
 * THE HIDE RULE IS NARROWER THAN IT WAS, DELIBERATELY. This function used to
 * return `null` for every not-ready state, on the argument that "an offer that
 * isn't there needs no excuse" — the primary control should not spend its time
 * apologising, and "Show answer" simply takes the row.
 *
 * That argument is still right for a *permanent* failure: a model that cannot
 * load is not an offer, and a dead control that fires a haptic and then dies on
 * `speakNow`'s own `!voice.isReady` guard is worse than no control.
 *
 * It was wrong for a download in progress. Voice now ships ON by default, so the
 * common case is a learner reaching their first session while ~103 MB is still
 * arriving — and hiding made that indistinguishable from the feature not
 * existing. A download is temporary and explainable, which is exactly the case
 * where saying so beats hiding. `useVoiceReview`'s own `VoicePhase` doc has
 * argued this the whole time: "wait" and "this will never work until you change
 * a setting" mean opposite things to a learner and must not share a state.
 *
 * So: `preparing`, `waiting-network` and `mic-denied` now render (disabled, and
 * naming themselves); a terminal load error still returns `null`.
 *
 * There is no paused state to check any more. Muting was a header toggle back
 * when the mic armed itself on every card; now nothing opens it but this
 * button, so declining to tap it IS the mute.
 */
export function voiceButtonMode(
  phase: VoicePhase,
  readiness: VoiceReadiness,
  /**
   * Hands-free is running this card: the microphone opens itself when the
   * Arabic ends, so there is nothing for a "Speak to answer" button to do.
   *
   * The button is not deleted, it is *unneeded* — which is a different claim,
   * and the difference is every state below. A model still downloading, a
   * download held for Wi-Fi and a refused microphone are all things hands-free
   * cannot fix and the learner can, so those keep their control whatever this
   * says. What goes is the pair of states that only ever meant "open the mic"
   * and "close it" — both of which the card now does on its own — leaving one
   * button in the band instead of two, and no instruction to read.
   */
  handsFree = false,
): VoiceButtonMode | null {
  switch (readiness.kind) {
    case 'off':
      return null;
    case 'failed':
      // Terminal for this session. Nothing the learner does in the action band
      // fixes it, and Account → Advanced carries the actual reason.
      return null;
    case 'waiting-wifi':
      return 'waiting-network';
    case 'mic-denied':
      return 'mic-denied';
    case 'preparing':
    // The review screen always retains the engine, so a model that is present
    // but not loaded is a recognizer that is seconds away — same story to tell.
    case 'model-ready':
    // Likewise `pending`: reaching this screen with voice on means the prefetch
    // is running or about to. It renders without a percentage, since there is
    // no real number to quote yet.
    case 'pending':
      return 'preparing';
    case 'ready':
      break;
  }

  switch (phase) {
    case 'loading':
      return 'preparing';
    case 'denied':
      return 'mic-denied';
    case 'listening':
      // Hands-free: the gate closes the window on its own, and the card's meter
      // already says it is listening. A "Done" button appearing here would also
      // reflow the band under the learner's thumb at the exact moment they are
      // speaking, which is the reflow this screen was rewritten to remove.
      return handsFree ? null : 'live';
    case 'arming':
    case 'checking':
      // Nothing to press either way — but with no peer in the band, a lone
      // disabled chip is just an obstacle where hands-free needs none.
      return handsFree ? null : 'busy';
    default:
      return handsFree ? null : 'ready';
  }
}

interface VoiceAnswerButtonProps {
  mode: VoiceButtonMode;
  /**
   * 0..1 while the model is downloading. Omit once only the engine is left to
   * build — there is no meaningful percentage for that, and the label drops the
   * number rather than quoting a fake one.
   */
  progress?: number;
  /** Offered when the download is holding out for Wi-Fi. */
  onDownloadOverCellular?: () => void;
  /** Offered once the OS has refused the mic — opens system settings. */
  onEnableMicrophone?: () => void;
  /** Open the mic now. Stops the prompt on its way in, so a learner who is
   *  ready before the clip ends does not have to sit through it. */
  onSpeakNow: () => void;
  /** Done speaking: close the mic and grade what was captured. */
  onStopSpeaking: () => void;
}

export const VoiceAnswerButton: FC<VoiceAnswerButtonProps> = ({
  mode,
  progress,
  onSpeakNow,
  onStopSpeaking,
  onDownloadOverCellular,
  onEnableMicrophone,
}) => {
  const colors = useColors();
  const isLive = mode === 'live';
  const isPreparing = mode === 'preparing';
  const isWaitingNetwork = mode === 'waiting-network';
  const isMicDenied = mode === 'mic-denied';
  // The three explain-yourself states are not offers — they carry no haptic and
  // no tint, and two of them are not even tappable. They occupy the slot only so
  // the row does not silently lose half its width when voice arrives mid-session.
  const isOffer = !isPreparing && !isWaitingNetwork && !isMicDenied;

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
    if (isPreparing) return;
    if (isWaitingNetwork) {
      onDownloadOverCellular?.();
      return;
    }
    if (isMicDenied) {
      onEnableMicrophone?.();
      return;
    }
    selectionFeedback();
    if (isLive) {
      onStopSpeaking();
      return;
    }
    onSpeakNow();
  }, [
    isPreparing,
    isWaitingNetwork,
    isMicDenied,
    isLive,
    onSpeakNow,
    onStopSpeaking,
    onDownloadOverCellular,
    onEnableMicrophone,
  ]);

  const label = ((): string => {
    if (isPreparing) {
      return progress === undefined
        ? STRINGS.VOICE_PREPARING
        : STRINGS.VOICE_PREPARING_TEMPLATE(Math.round(progress * 100));
    }
    if (isWaitingNetwork) return STRINGS.VOICE_WAITING_WIFI;
    if (isMicDenied) return STRINGS.VOICE_ENABLE_MICROPHONE;
    return isLive ? STRINGS.VOICE_DONE_SPEAKING : STRINGS.VOICE_SPEAK_TO_ANSWER;
  })();

  // `busy` outlasts an eyeblink — grading takes about a second — so unlike the
  // card-advance disable it has to be visible, or the learner taps a live-
  // looking button and nothing happens. State-driven, so it rides a CSS
  // transition per the house split, and it stands the button down rather than
  // giving it a fourth label to say so.
  const standDown = mode === 'busy' || isPreparing;

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
        label={label}
        accessibilityLabel={
          isPreparing
            ? STRINGS.VOICE_PREPARING_A11Y
            : isOffer && !isLive
              ? STRINGS.VOICE_CHANNEL_LABEL
              : label
        }
        color={isOffer ? colors.tint : colors.textTertiary}
        variant={isOffer ? 'primary' : 'quiet'}
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
