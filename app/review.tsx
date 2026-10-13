import { router, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import type { ReviewCardHandle } from '@/components/review/ReviewFlipCard';
import {
  CompletionScreen,
  ReviewActionButton,
  ReviewContextSentence,
  ReviewFlipCard,
  ReviewGradeBar,
  ReviewHeader,
  ReviewRootInsight,
  VoiceAnswerButton,
  voiceButtonMode,
  VoiceListeningIndicator,
  voiceIndicatorState,
  VoiceResultPanel,
} from '@/components/review';
import { useTutorialContext, useVoiceGrading } from '@/components/providers';
import { useVoiceModel } from '@/hooks/voice/useVoiceModel';
import { allowMeteredVoiceModelDownload } from '@/services/voiceModelStore';
import { voiceReadiness } from '@/utils/voiceReadiness';
import type { WordConfidence } from '@/types/review.types';
import { ReviewGradesTutorial } from '@/components/tutorials/ReviewGradesTutorial';
import { PulsatingLoader } from '@/components/ui';
import { TIMING_CONFIG, VERDICT } from '@/constants/animation';
import { getElevation } from '@/constants/elevation';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { TutorialId } from '@/constants/tutorials';
import { useKeepScreenAwake } from '@/hooks/common/useKeepScreenAwake';
import {
  micHoldsAudioSession,
  useReview,
  useReviewExamples,
  useReviewGlossAlternates,
  useReviewRootEnrichments,
  useVoiceReview,
} from '@/hooks/review';
import { useColors } from '@/hooks/theme/useColors';
import { useTutorial } from '@/hooks/tutorials/useTutorial';
import { useAppSelectorShallow } from '@/store/hooks';
import { selectVoiceHandsFree } from '@/store/settingsSlice';
import { getDiagSnapshot, subscribeDiag } from '@/utils/reviewDiagnostics';

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  // The card's lane in the column: it takes whatever is left between the header
  // and the action row, so the card sizes itself to the device instead of the
  // old fixed 360px box that left a void on tall screens.
  //
  // One frame for the whole screen: header, card and action band share the
  // XLARGE side inset. Below the card, LARGE is the whole gap to the buttons —
  // the band is exactly the button row. Above it, MEDIUM plus the air around
  // the header's thin bar and bare glyph (both centred in a 44pt row) comes to
  // roughly twice that, which is the proportion the screen is drawn to: room
  // over the card, the actions held close under it.
  cardArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  bottomSlot: {
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  // Fixed band. Every state the bottom can hold lives inside it, absolutely
  // anchored to the bottom edge, so the card above (which is flex: 1) keeps its
  // height whatever is showing — and so two states cross-fading during a swap
  // can overlap without either of them changing the layout.
  actionSlot: {
    width: '100%',
    height: LAYOUT.REVIEW.ACTION_SLOT_HEIGHT,
  },
  actionState: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
  },
  headerPadding: {
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  // Every state of the band is a row of ReviewActionButtons, so the reveal
  // pair, the three grades and the voice row are one shape in three costumes.
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
});

/**
 * Bottom-band swap. The delay is the flip: `revealed` turns the card over
 * TIMING_CONFIG.FLIP.duration and the front face is still facing the learner
 * until the rotation passes 90°, so a control that swapped on the same frame as
 * the state sat under a card still showing the question for ~160ms — the grade
 * options arrived before the answer did. Entering at the halfway mark lands the
 * new control exactly as its face comes round.
 */
const ACTION_ENTERING = FadeIn.delay(TIMING_CONFIG.FLIP.duration / 2).duration(
  TIMING_CONFIG.FAST.duration,
);
const ACTION_EXITING = FadeOut.duration(TIMING_CONFIG.FAST.duration);

/** Stable identity for a card with no corpus glosses yet (or none at all). */
const EMPTY_GLOSSES: string[] = [];

/** Reusable loading state component for review screen */
function ReviewLoadingState({
  message,
  progress,
  successMessage,
}: {
  message: string;
  progress?: number;
  successMessage?: string;
}) {
  const colors = useColors();
  return (
    <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
      <View style={baseStyles.containerCentered}>
        <PulsatingLoader size={64} />
        <ThemedText style={baseStyles.loadingText}>{message}</ThemedText>
        {progress !== undefined && (
          <ThemedText style={[baseStyles.loadingSubtext, { color: colors.secondaryText }]}>
            {Math.round(progress)}% complete
          </ThemedText>
        )}
        {successMessage && (
          <ThemedText style={[baseStyles.loadingText, { color: colors.success }]}>
            {successMessage}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

/**
 * Owns the diagnostics-store subscription so counter/timeline updates repaint
 * only this overlay, rather than the full review screen. The component is
 * mounted only while the HUD is visible, so normal review sessions do not
 * subscribe to diagnostics at all.
 */
function ReviewDebugHud({
  insetTop,
  modelLabel,
  phase,
  debug,
}: {
  insetTop: number;
  modelLabel: string;
  phase: string;
  debug: ReturnType<typeof useVoiceReview>['debug'];
}): JSX.Element {
  const colors = useColors();
  const diag = useSyncExternalStore(subscribeDiag, getDiagSnapshot, getDiagSnapshot);

  return (
    <View
      pointerEvents="none"
      style={[
        voiceDebugStyles.container,
        {
          top: insetTop + LAYOUT.SPACING.LARGE * 2,
          backgroundColor: colors.elevation3,
          ...getElevation(colors, 'MODAL'),
        },
      ]}
    >
      <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
        {`model: ${modelLabel}`}
      </ThemedText>
      <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
        {`phase: ${phase}`}
      </ThemedText>
      {debug.recorder && (
        <>
          <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
            {`rec: ${debug.recorder.stopReason} @${debug.recorder.stopDecidedAtMs}ms · ${debug.recorder.gateUsed} · dur ${debug.recorder.durationMs}ms · ${debug.recorder.bufferCount}buf · 1st ${debug.recorder.firstBufferMs ?? 'never'}ms`}
          </ThemedText>
          <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
            {`peak ${debug.recorder.peakRms.toFixed(5)} · room ${debug.recorder.noiseFloorDb?.toFixed(0) ?? 'never'}dB · voice ${debug.recorder.speechMs}ms · ${debug.recorder.heardSpeech ? 'speech' : 'silent'}`}
          </ThemedText>
        </>
      )}
      {debug.transcript.length > 0 && (
        <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
          {`heard: "${debug.transcript}"`}
        </ThemedText>
      )}
      {debug.match && (
        <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
          {`match: ${debug.match.matched ? '✓' : '✗'} ${debug.match.method} · sim ${debug.match.similarity.toFixed(2)} · expected "${debug.match.expected}"`}
        </ThemedText>
      )}
      {debug.armError && (
        <ThemedText colorName="error" type="caption" style={voiceDebugStyles.line}>
          {`arm error: ${debug.armError}`}
        </ThemedText>
      )}
      {/* A healthy session downloads nothing: everything was preloaded. */}
      <ThemedText
        colorName={diag.counters.networkDownloads > 0 ? 'error' : 'textTertiary'}
        type="caption"
        style={voiceDebugStyles.line}
      >
        {`net: ${diag.counters.networkDownloads} dl (${diag.counters.networkMs}ms, ${diag.counters.networkFailures} fail) · cache ${diag.counters.cacheHits}`}
      </ThemedText>
      <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
        {`mic: ${diag.counters.micArms}ok/${diag.counters.micArmFailures}fail · open ${diag.counters.lastPromptToMicMs}ms (worst ${diag.counters.worstPromptToMicMs}ms)`}
      </ThemedText>
      {diag.tail.map(entry => (
        <ThemedText
          key={`${entry.at}-${entry.event}`}
          colorName="textTertiary"
          type="caption"
          style={voiceDebugStyles.line}
        >
          {`Δ${entry.delta} ${entry.event}`}
        </ThemedText>
      ))}
    </View>
  );
}

// Main review content component (only rendered after tutorial is dismissed)
function ReviewContent({ fromRemember }: { fromRemember: boolean }): JSX.Element {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const voiceDebugEnabled = useAppSelectorShallow(state => state.settings.voiceDebugEnabled);
  const voiceHandsFree = useAppSelectorShallow(selectVoiceHandsFree);
  const diagnosticsEnabled = __DEV__ || voiceDebugEnabled;

  // Read before useReview: the review hook takes `setPlaybackPriority` from
  // here so the Arabic prompt can claim a full-volume playback session.
  const voice = useVoiceGrading();
  const voiceModel = useVoiceModel();
  const {
    currentSentence,
    currentMeaning,
    revealed,
    isComplete,
    isEmpty,
    progress,
    maxProgress,
    gradeRecoveryEpoch,
    currentWordKey,
    promptAudioDoneKey,
    revealAnswer,
    grade,
    intervalLabels,
    handleClose,
    isUpdating,
    transparentStyle,
    sessionMetrics,
    handleReplayAudio,
    isAudioPreloading,
    audioPreloadProgress,
    isAudioReady,
    isLoading,
    wordQueue,
    enrichmentBatches,
    sessionWords,
    currentWord,
    revealMeaningPassive,
    stopAudio,
    playSentenceAudio,
    restudying,
    continueFromRestudy,
  } = useReview({
    fromRemember,
    setPlaybackPriority: voice.setPlaybackPriority,
    isMicStreamOpen: voice.isMicStreamOpen,
    diagnosticsEnabled,
  });

  // A card is read, thought about, and sometimes spoken to — all of which the
  // OS scores as idle, so the display dimmed and locked mid-recall on the
  // default timeout and the learner had to wake the phone to answer. Sits above
  // the early returns below, so it also covers the word fetch and the
  // audio-preload wait: the stretches with no touches at all.
  //
  // Dropped once the session is over. The completion screen renders from this
  // same route, and a finished session left face-up on a table would otherwise
  // hold the display on until the learner came back and closed it — the summary
  // is the one state here that nobody is mid-thought over.
  //
  // The condition mirrors the completion-screen early return below EXACTLY,
  // rather than the shorter `!isComplete`: the last grade of a session sets
  // `isComplete` while `isUpdating` is still true for the FSRS write, and for
  // that window the card, its verdict ring and its exit are all still on
  // screen. Releasing on the shorter form dropped the lock while the learner
  // was still looking at a card.
  const showingCompletion = isComplete && !isUpdating;
  useKeepScreenAwake(!showingCompletion);

  /**
   * Every grade in the session goes through here, whichever input decided it.
   *
   * Grading used to confirm nothing. You learned you were right because the
   * next word appeared — and on two of the three paths there was not even a
   * departure to watch: a voice-correct answer and a "Guessed" dissolved from
   * rest without moving. So the card now shows an outcome, and the outcome is
   * played from ONE place rather than each input inventing its own.
   *
   * The verdict is gated on `grade`'s return value. Several guards inside it
   * drop a grade silently (an advance already in flight, a restudy hold, an
   * unrevealed card), and confirming one of those would be a lie — this is also
   * what fixes the old ordering here, which flew the card off screen before
   * asking whether the grade would be accepted.
   *
   * `known` additionally leaves to the right, after the beat. "Guessed" keeps
   * its plain dissolve — it is the grade with no direction, and the difference
   * in how the two leave is what tells them apart at a glance.
   */
  const cardRef = useRef<ReviewCardHandle>(null);

  /**
   * Bumped when the app returns to the foreground AFTER backgrounding while a
   * grade was actively committing, and folded into both the card's `key`
   * below and the action band's `LayoutAnimationConfig` key further down
   * (the actual grade buttons' parent — a SEPARATE wrapper `ReviewFlipCard`'s
   * own remount does not reach) to force a full remount of each.
   *
   * Root cause, confirmed against Reanimated's own issue tracker, not just
   * this app's behaviour: a Reanimated animation (a shared-value `withTiming`/
   * `withSequence`, OR a layout animation's `entering`/`exiting`) that starts
   * or is mid-flight while the OS has suspended the UI thread's frame loop —
   * which backgrounding does — can leave Reanimated's view state desynced
   * from Fabric's actual mounting layer once the thread resumes. This is a
   * documented, currently-open class of hazard in react-native-reanimated
   * (github.com/software-mansion/react-native-reanimated/issues/7493 — fixed
   * there for the crash a layout-animation race caused, by skipping
   * not-yet-mounted views; the underlying "queued animation start racing a
   * blocked UI thread's mounting work" mechanism is not specific to that one
   * crash and is exactly what this app hits, non-crashing, as stale paint).
   *
   * Observed on device from the shared-value half of it: grade a card "Knew
   * it", background the app within the verdict ring's beat (`useCardVerdict`,
   * its ignite/decay `withSequence` is still running), wait, resume — the
   * NEXT card comes up ringed green and labelled "Knew it" for a grade it was
   * never given, and no amount of re-grading, re-revealing, or waiting clears
   * it. Traced with logging: the underlying shared value DOES correctly read
   * back as reset (0 / NONE, confirmed from both a worklet and the JS
   * thread) — cancelling more aggressively or re-issuing the reset (both
   * tried) cannot fix a paint that a correct value isn't triggering. The
   * action band's OWN `entering`/`exiting` (below) is the layout-animation
   * half of the same hazard class, on the actual button-holding view.
   *
   * A fresh component instance has no native view to have stale mount state
   * on — it mounts already reflecting current props and shared-value INITIAL
   * values.
   *
   * Gated on `isUpdating` at the moment backgrounding STARTED (not read at
   * resume — by then a grade begun before backgrounding has near-certainly
   * already finished, per the JS-thread watchdog in useReview.commitGrade,
   * which fires even while backgrounded) rather than remounting on every
   * foreground return: an unconditional remount replaces this bug with a
   * different one — the card's OWN flip re-paints wrong on a fresh mount
   * created during the same resume window (confirmed on device: reveal a
   * card, background with nothing grading, resume — the question face shows
   * despite `revealed` being true and the grade bar rendering correctly).
   * Remounting is a real fix for "mount state got lost" only when something
   * was actually mid-transition; gating on it costs nothing on the vastly
   * more common "just switched apps" case, which never had anything to lose.
   */
  const [remountEpoch, setRemountEpoch] = useState(0);
  const wasGradingRef = useRef(false);
  const isUpdatingRef = useRef(isUpdating);
  useEffect(() => {
    isUpdatingRef.current = isUpdating;
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        wasGradingRef.current = isUpdatingRef.current;
        return;
      }
      if (nextState !== 'active' || !wasGradingRef.current) return;
      wasGradingRef.current = false;
      setRemountEpoch(epoch => epoch + 1);
    });
    return () => subscription.remove();
  }, []);

  // A rejected grade keeps the same revealed card available for retry. Reset
  // only the presentation started by the attempted grade; remounting the card
  // would also run its new-word effect and incorrectly flip back to the prompt.
  useLayoutEffect(() => {
    if (gradeRecoveryEpoch > 0) cardRef.current?.resetGradePresentation();
  }, [gradeRecoveryEpoch]);

  const gradeWithVerdict = useCallback(
    (confidence: WordConfidence, opts: { fromVoice?: boolean } = {}) => {
      if (!grade(confidence, opts)) return;
      cardRef.current?.playVerdict(confidence);
      if (confidence === 'known') {
        cardRef.current?.commitTo('right', VERDICT.BEAT);
      }
    },
    [grade],
  );

  // One example sentence per word in each immutable scheduler batch, fetched
  // once and never on the per-card path. Non-blocking: a card renders without
  // it and picks it up when it lands, so a slow or failed lookup can never hold
  // up a session.
  const examples = useReviewExamples(enrichmentBatches);
  const currentExample = currentWord ? (examples.get(currentWord.root_id) ?? null) : null;

  // Root stories share the example lane's batch-level, non-blocking fetch. A
  // forgotten card therefore has its explanation ready without introducing a
  // request into the moment the learner is waiting for feedback.
  const rootEnrichments = useReviewRootEnrichments(enrichmentBatches);
  const currentRootInsight = currentWord
    ? (rootEnrichments.get(currentWord.root_id)?.usageNote ?? null)
    : null;

  // Every English name the corpus gives each admitted word. Same bounded,
  // non-blocking batch-level prefetch as the examples above; it only widens what
  // voice grading accepts, so a session runs unchanged without it.
  const glossAlternates = useReviewGlossAlternates(enrichmentBatches);
  const currentAlternates = currentWord
    ? (glossAlternates.get(currentWord.root_id) ?? EMPTY_GLOSSES)
    : EMPTY_GLOSSES;
  // The other answers currently in play. Voice grading never matches against
  // these — they exist only to veto remembering a "Got it" whose transcript is
  // a different drilled word's meaning, which is the one way the accept-list
  // could teach the app something actively wrong.
  //
  // Read from the whole session, not `wordQueue`. That is only the working
  // heap, and a missed word waiting out its drill lag is held outside it and
  // served straight back — so the very words being drilled, the likeliest to be
  // said by mistake, were the ones missing from the veto.
  const otherGlosses = sessionWords
    .filter(word => word.root_id !== currentWord?.root_id)
    .map(word => word.root?.meaning)
    .filter((meaning): meaning is string => Boolean(meaning));

  // The recogniser's hotwords: every answer due this session, known once at the
  // start. Not `wordQueue` — that is a 20-word working heap that refills, and
  // each refill would be a new vocabulary and another recogniser build.
  //
  // `undefined` until the session has loaded its words. The voice hook holds
  // off building the recogniser until it is told the vocabulary, and "none yet"
  // must not look like "none".
  //
  // "Loaded" means the words are HERE, not that the query has settled: the
  // session fills `sessionWords` in an effect, one commit after `isLoading`
  // drops, and for that commit an empty list read as a known, empty vocabulary
  // — which retained the engine and started the unbiased build this exists to
  // prevent. A session with no words has no card to grade either.
  const sessionGlosses =
    isLoading || sessionWords.length === 0
      ? undefined
      : sessionWords
          .map(word => word.root?.meaning)
          .filter((meaning): meaning is string => Boolean(meaning));

  // Voice grading — the microphone opens itself once the Arabic prompt has
  // played and the learner simply answers, so the action band carries "Show
  // answer" alone. With hands-free off (Account → Practice) the band carries a
  // tap-to-speak button beside it and the mic opens only on that press.
  //
  // Correct match → advance as "Knew it". Miss → mark the card wrong on the
  // spot, play the English audio, and show the result row (transcript + answer
  // + Missed it/Try again/Got it); that row is the answer surface for voice, so
  // the card is NOT flipped (a retry stays clean on the question face).
  const {
    phase: voicePhase,
    debug: voiceDebug,
    result: voiceResult,
    accept: voiceAccept,
    reject: voiceReject,
    retry: voiceRetry,
    speakNow: voiceSpeakNow,
    stopSpeaking: voiceStopSpeaking,
    handsFreeActive,
    micDenied,
  } = useVoiceReview({
    expected: currentWord?.root?.meaning ?? null,
    currentWordKey,
    rootId: currentWord?.root_id ?? null,
    glossAlternates: currentAlternates,
    otherGlosses,
    sessionGlosses,
    // Stop listening once the answer is revealed — the recall test is over.
    ready: !isUpdating && !isLoading && isAudioReady && !isComplete && !revealed,
    // The mic opens itself the moment the Arabic finishes. It cannot open any
    // earlier: the input stream is dropped for every prompt so the word plays
    // at full volume.
    promptDoneKey: promptAudioDoneKey,
    handsFree: voiceHandsFree,
    stopAudio,
    // Correct match → advance as "Knew it" (speaking the answer is the proof;
    // fromVoice bypasses the reveal guard). This used to be the worst path in
    // the session for knowing what had happened: no reveal, no motion, no
    // colour — the card simply stopped existing. It now pops green and throws
    // right like every other correct grade.
    onKnownAuto: () => gradeWithVerdict('known', { fromVoice: true }),
    // Sounded like the answer but transcribed as something else → Guessed. The
    // learner is credited (Hard is a pass) and the word returns sooner, which is
    // the right hedge when the transcript is what we're unsure about.
    onVagueAuto: () => gradeWithVerdict('vague', { fromVoice: true }),
    // Voice result panel "No, I missed it" → Forgot. The card is already red by
    // then (see onMissHeard), and the verdict layer will not replay a verdict it
    // is already showing, so this commits the grade without shaking the card a
    // second time.
    onUnknownAuto: () => gradeWithVerdict('unknown', { fromVoice: true }),
    // Miss → play the English audio (the panel shows the answer text + override).
    onRevealAnswer: revealMeaningPassive,
    // Said a real word and it wasn't the answer → mark the card wrong straight
    // away, while the panel is still asking. Provisional, not a grade: nothing
    // is written, and "I knew it" repaints the same card green and throws it
    // right. Red-then-green is not a contradiction here — it is the learner
    // overruling the recognizer, which is exactly what that button means.
    onMissHeard: () => cardRef.current?.playVerdict('unknown'),
  });

  // A wrong answer reddens the card and shows the interactive result panel in
  // place of the standard action buttons; a correct answer just proceeds (no
  // result).
  const voiceShowResult = voicePhase === 'result' && voiceResult !== null;
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);

  // The two halves of the voice UI, and the split between them: the BUTTON is
  // the action ("Speak to answer" / "Done"), the CARD is the state (a meter that
  // breathes while the mic opens and moves once it is live). The indicator is
  // still null far more often than not — every state it can show (arming,
  // listening, checking) is reachable only from a ready recognizer.
  //
  // The BUTTON now holds its slot through the preparing states rather than
  // vanishing. Readiness is passed to `voiceButtonMode` rather than tested here:
  // the phase alone cannot tell a downloading model from a failed one, and those
  // two want opposite treatment. See its doc.
  //
  // Both suppressed during an advance so a transient phase can't flash while
  // the next card is handed over.
  const voiceActive = voiceEnabled && !isUpdating;
  const readiness = voiceReadiness({
    voiceEnabled,
    micDenied: micDenied || voicePhase === 'denied',
    model: voiceModel,
    engine: {
      isReady: voice.isReady,
      isWarming: voice.isWarming,
      error: voice.error ? new Error(voice.error) : null,
    },
  });

  // NO mid-card latch, and that is a deliberate simplification. The worry was a
  // recognizer arriving mid-card and swapping the row under the learner's thumb
  // — which was real while the button VANISHED during preparation, because the
  // row went from one full-width "Show answer" to a two-up split the instant the
  // model landed. Now the button holds its slot the whole time, so nothing
  // reflows: the right-hand peer only changes its own label from
  // "Preparing voice… 98%" to "Speak to answer" and stops being disabled. A tap
  // that lands a frame early hits a disabled button and does nothing, which is
  // the same outcome as before it arrived.
  //
  // Hands-free suppresses only the two states that mean "open the mic" and
  // "close it" — a card that opens its own microphone needs neither — so the
  // band holds "Show answer" alone and reads as one thing to do rather than a
  // choice between two.
  //
  // `handsFreeActive` is taken whole from the hook and deliberately NOT
  // re-derived from the setting here: it also carries "the OS has granted the
  // microphone" and "this card's window already heard nobody", and both are
  // states where the button is the learner's only way forward. See its doc for
  // what re-deriving it cost.
  const voiceMode = voiceActive ? voiceButtonMode(voicePhase, readiness, handsFreeActive) : null;

  // The escape hatch for a learner who wants voice now and is not on Wi-Fi. The
  // size is in the button's own label, so this is a deliberate, informed spend
  // of their data rather than something we decided for them.
  const handleDownloadOverCellular = useCallback(() => {
    void allowMeteredVoiceModelDownload();
  }, []);

  // A refused microphone no longer turns the feature off, so it needs somewhere
  // to go. Same escape hatch the account screen uses for its own permissions.
  const handleEnableMicrophone = useCallback(() => {
    void Linking.openSettings();
  }, []);
  const indicatorState = voiceActive ? voiceIndicatorState(voicePhase) : null;

  // Replay is the word itself now, on both faces — offered whenever the
  // microphone is not holding the audio session (see `micHoldsAudioSession`).
  // Outside that window the word takes the press; inside it the word takes no
  // press at all and the tap reveals, as every other part of the face does.
  //
  // Read from the PHASE, not from `indicatorState` above. The two agree on the
  // three phases that matter, but `indicatorState` is additionally suppressed
  // by `isUpdating` because a transient caption must not flash during a card
  // handover — and a grade commit sets `isUpdating` while the mic can still be
  // live, so a gate built on it would open in exactly the window it exists to
  // close.
  const canReplayAudio = !micHoldsAudioSession(voicePhase);

  // "Forgot" from the bar never exits here: it opens a restudy hold, so the
  // card is staying put and throwing it off screen would be a lie. Its left
  // exit is deferred to the tap that leaves the hold, below.
  const handleGradeFromBar = useCallback(
    (confidence: WordConfidence) => gradeWithVerdict(confidence),
    [gradeWithVerdict],
  );

  // Re-recording discards the attempt that produced the mishear, so the red it
  // put on the card has to go with it. Left alone, the learner would speak into
  // a card still marked wrong for an answer they are in the middle of replacing.
  const handleVoiceRetry = useCallback(() => {
    cardRef.current?.clearVerdict();
    voiceRetry();
  }, [voiceRetry]);

  // Leaving the restudy hold is the moment the "Forgot" actually commits, so
  // that is where its exit belongs. No beat and no second verdict: the red ring
  // has been sitting on this card for the whole hold, which is as long a moment
  // as the session gives anything.
  const handleRestudyContinue = useCallback(() => {
    cardRef.current?.commitTo('left');
    continueFromRestudy();
  }, [continueFromRestudy]);

  // A resolved empty due query is not a successful review session. Replace
  // the deep-linked route with Practice directly: handleClose deliberately
  // finalizes a real session, which is exactly what must not happen here.
  useEffect(() => {
    if (!isLoading && isEmpty) router.replace(ROUTE_PATHS.PRACTICE_TAB);
  }, [isEmpty, isLoading]);

  // Keep the route visually neutral for the brief frame before replace lands.
  if (isEmpty) {
    return <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />;
  }

  // `isComplete` now means every word the session started with is done — the
  // queue refills itself from the backlog rather than stopping at the first
  // chunk, so reaching here is the real end and there is nothing left to offer.
  if (showingCompletion) {
    return (
      <CompletionScreen
        sessionMetrics={sessionMetrics}
        testID="completion-screen"
        fromRemember={fromRemember}
        onContinue={handleClose}
      />
    );
  }

  // Show beautiful loader while practice session is loading words or initializing
  // This takes precedence over audio preloading during initial load
  if (isLoading || (wordQueue.length === 0 && !isComplete && currentWord === null)) {
    return <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />;
  }

  // Show audio preloading indicator (only when not in initial loading phase).
  // This now covers just the first card's audio — the rest of the session's
  // files keep downloading behind the live session.
  if (isAudioPreloading) {
    return (
      <ReviewLoadingState
        message={STRINGS.LOADING_AUDIO_ELLIPSIS}
        progress={audioPreloadProgress}
        successMessage={isAudioReady ? STRINGS.AUDIO_READY : undefined}
      />
    );
  }

  return (
    <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
      {/* Header / card / actions as a real column. This screen used to render
          the card as an absolute fill with the chrome floating over it, which
          is why the card had a hardcoded height and the voice pill needed a
          hand-computed `bottom` offset built from four spacing tokens. The card
          now simply takes the space between the two. */}
      <View
        style={[baseStyles.headerPadding, Platform.OS === 'android' && { paddingTop: insets.top }]}
      >
        {/* Progress, the run counter and the way out — nothing else. The mic
            that used to sit beside the close button is gone: speaking is
            offered by the bottom band, where the learner is already choosing
            how to answer, and a second mic up here was a control for a
            decision that band already carries. */}
        <ReviewHeader
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
          recallRun={sessionMetrics.currentStreak}
          wordsDone={sessionMetrics.wordsReviewed}
        />
      </View>

      <View style={baseStyles.cardArea}>
        <ReviewFlipCard
          key={remountEpoch}
          ref={cardRef}
          wordKey={currentWordKey}
          word={currentSentence.wordForm}
          answer={currentMeaning}
          // Answer face only — see ReviewFlipCard. Comes from the example
          // lookup's word_types join, so it is absent until the examples land
          // and for roots the corpus has no class for; WordDisplay reserves the
          // band either way.
          wordType={currentExample?.wordType}
          revealed={revealed}
          onReveal={revealAnswer}
          onReplayAudio={canReplayAudio ? () => void handleReplayAudio() : undefined}
          opacityStyle={transparentStyle}
          testID="review-card"
          restudying={restudying}
          onRestudyContinue={handleRestudyContinue}
          // A voice miss discloses the answer without flipping the card, so the
          // English goes under the Arabic on the question face. The card renders
          // its own `answer` there rather than the screen passing a second copy
          // of the same string.
          discloseAnswer={voiceShowResult}
          // What the recognizer heard, under that answer. It is evidence for
          // the three choices in the band below and a miss must never be
          // graded without it — it just no longer needs a reserved line in
          // the band to be shown.
          discloseCaption={
            voiceShowResult
              ? voiceResult.heard.length > 0
                ? STRINGS.VOICE_RESULT_HEARD_TEMPLATE(voiceResult.heard)
                : STRINGS.VOICE_RESULT_NOT_HEARD
              : undefined
          }
          questionSlot={
            indicatorState ? (
              <VoiceListeningIndicator state={indicatorState} level={voice.micLevel} />
            ) : null
          }
          answerSlot={
            restudying && currentRootInsight ? (
              <ReviewRootInsight explanation={currentRootInsight} />
            ) : currentExample ? (
              <ReviewContextSentence
                example={currentExample}
                onPlay={
                  currentExample.audioUrl
                    ? () => {
                        const path = currentExample.audioUrl;
                        if (path) void playSentenceAudio(path);
                      }
                    : undefined
                }
              />
            ) : null
          }
        />
      </View>

      {/* Bottom actions. Shares the card's fade (transparentStyle) so the
          controls and the word they belong to leave and arrive as one
          composition — the card used to dissolve while the buttons stayed
          fully lit, which made every advance look half-finished. */}
      <Animated.View
        style={[
          baseStyles.bottomSlot,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE },
          transparentStyle,
        ]}
      >
        {/* Keyed on the card, so a card change UNMOUNTS this wrapper — which is
            the only moment `skipExiting` applies (it fires from the wrapper's
            own componentWillUnmount, tagging its SINGLE child so the native side
            skips that view's exit). It therefore has to sit directly around the
            branch: wrapping the slot View instead tags a view that has no exit
            animation of its own, and the branch inside still animated out —
            verified on device, chips still lingered ~10 frames.

            `skipEntering` is the same idea in reverse. The 160ms entering delay
            below exists to wait out the FLIP — but a new card arrives already
            on its question face, with no flip to wait for, so on that path the
            delay was dead time: the card was back and the band stayed empty for
            another ~280ms. The band already rides the card's own fade-in, which
            is the appearance it needs. Within a card the wrapper stays mounted,
            so the flip-timed entering still applies where it was designed to.

            That placement gives the band the distinction it needs:

            - Swapping branches WITHIN a card (reveal → grade bar on the flip,
              grade bar → voice result) leaves the wrapper mounted, so those
              keep their cross-fade, which is what the 160ms entering delay was
              tuned for.
            - Advancing to a new card unmounts it, and the outgoing branch is
              removed instantly instead of animating.

            Without this, a branch's 120ms FadeOut ran while the band sat at
            opacity 0 riding the card's fade, was still in flight when the band
            faded back in, and got multiplied back into view — grade chips
            hanging over the incoming card for ~4-5 frames. Same cause as the
            "Tap to continue" reappearance, which the restudy branch solves by
            having no exit at all (it only ever leaves via an advance). */}
        <View style={baseStyles.actionSlot}>
          {/* `remountEpoch` folded in alongside `currentWordKey` (see its own
              comment above `cardRef`): this wrapper's branch swaps run on
              Reanimated layout animations (`entering`/`exiting` below) exactly
              like the confirmed-real Reanimated/Fabric hazard that motivated
              `remountEpoch` — a layout-animation start queued while the UI
              thread is blocked (backgrounding does this) can desync from the
              Fabric mounting layer once the thread resumes (see
              github.com/software-mansion/react-native-reanimated/issues/7493,
              fixed for the crash it caused there but the underlying
              stale-mount-state class is not specific to that one crash). This
              wrapper is the actual grade buttons' parent — `ReviewFlipCard`'s
              own remount does not reach it — so it needs the same fresh start
              on a backgrounding-interrupted resume. */}
          <LayoutAnimationConfig key={`${currentWordKey}-${remountEpoch}`} skipEntering skipExiting>
            {restudying ? (
              // A forgotten card holds here instead of advancing. The whole card
              // is the tap target (see onRestudyContinue on ReviewFlipCard), so
              // this is a prompt rather than a button — one easy tap anywhere, no
              // aiming.
              // No `exiting`. Unlike the other branches, which swap WITHIN a card
              // while the band is at full opacity, a restudy hold only ever ends
              // by advancing — and by then the band is already at opacity 0,
              // riding the card's own fade. Its 120ms FadeOut therefore ran
              // invisibly, was still in flight when the band faded back in for the
              // next card, and got multiplied back into view: "Tap to continue"
              // reappeared faintly over the incoming card for ~165ms before
              // vanishing again. Unmounting outright is invisible, because
              // nothing is on screen at that moment anyway.
              <Animated.View
                key="restudy"
                entering={ACTION_ENTERING}
                style={baseStyles.actionState}
              >
                <View style={baseStyles.actionRow}>
                  <ReviewActionButton
                    label={STRINGS.RESTUDY_CONTINUE}
                    testID="review-restudy-continue"
                    // Alone in the band, same as "Show answer" with voice off —
                    // takes the app's standalone-CTA pill shape instead of
                    // sitting there as a quiet, easy-to-miss chip.
                    color={colors.tint}
                    variant="primary"
                    onPress={handleRestudyContinue}
                  />
                </View>
              </Animated.View>
            ) : voiceShowResult ? (
              <Animated.View
                key="voice-result"
                entering={ACTION_ENTERING}
                exiting={ACTION_EXITING}
                style={baseStyles.actionState}
              >
                <VoiceResultPanel
                  onAccept={voiceAccept}
                  onReject={voiceReject}
                  onRetry={handleVoiceRetry}
                />
              </Animated.View>
            ) : revealed ? (
              <Animated.View
                key="grade"
                entering={ACTION_ENTERING}
                exiting={ACTION_EXITING}
                style={baseStyles.actionState}
              >
                <ReviewGradeBar
                  intervals={intervalLabels}
                  onGrade={handleGradeFromBar}
                  disabled={isUpdating}
                />
              </Animated.View>
            ) : (
              // What the learner can do about this card, in the one place this
              // screen puts things you can do.
              //
              // Hands-free leaves ONE button here. The exercise is speaking,
              // and speaking now has no control — the mic opens itself and the
              // card's own meter shows it listening — so the band is left with
              // the way out of the exercise and nothing else. That is the whole
              // point of the change: the band used to carry two buttons and an
              // implied instruction ("tap this to speak, tap that to give up"),
              // and the version with a self-opening microphone needs neither.
              //
              // With hands-free off it is a pair again: same height, same
              // shape, one line of text each, no glyphs, with fill carrying
              // the hierarchy — the voice CTA solid, "Show answer" the quieter
              // tinted chip beside it, reading as "the exercise, and the way
              // out of it" rather than two muted buttons in different colours.
              <Animated.View
                key="reveal"
                entering={ACTION_ENTERING}
                exiting={ACTION_EXITING}
                style={baseStyles.actionState}
              >
                <View style={baseStyles.actionRow}>
                  <ReviewActionButton
                    label={STRINGS.SHOW_ANSWER}
                    testID="review-show-answer"
                    // Same hue as the voice CTA, not a neutral grey: `secondaryText`
                    // is a near-white, almost-no-chroma token, and mixed into a
                    // tinted chip it read as a flat, lifeless grey rather than a
                    // quieter sibling. `colors.tint` at the tinted chip's fill
                    // (a light mix, not a solid fill) still reads clearly as the
                    // quieter of the two — Material 3 pairs a filled and a tonal
                    // button in the same colour for exactly this reason — while
                    // giving "Show answer" a real colour instead of none. Weight
                    // does the demoting, not hue: when voice is on, speaking is
                    // the exercise and revealing is the way out of it, so the
                    // voice CTA carries `primary` instead (see VoiceAnswerButton)
                    // and this one stays the quieter `tinted` chip beside it.
                    //
                    // Loud ONLY when voice is off, where revealing is the whole
                    // exercise and this button is the band's only occupant — so
                    // it takes the app's standalone-CTA shape rather than
                    // sitting there as a grey ghost.
                    //
                    // It stays quiet under hands-free even though it is alone
                    // there too. Being the only button does not make it the
                    // main action: the main action is speaking, which has no
                    // button, and painting the escape hatch as the loudest
                    // thing on the card would invite exactly the tap the
                    // exercise exists to avoid. See ReviewActionButton on where
                    // `primary` may and may not appear.
                    color={colors.tint}
                    variant={voiceMode || handsFreeActive ? 'quiet' : 'primary'}
                    disabled={isUpdating}
                    onPress={revealAnswer}
                  />
                  {voiceMode ? (
                    <VoiceAnswerButton
                      mode={voiceMode}
                      progress={readiness.kind === 'preparing' ? readiness.progress : undefined}
                      onSpeakNow={voiceSpeakNow}
                      onStopSpeaking={voiceStopSpeaking}
                      onDownloadOverCellular={handleDownloadOverCellular}
                      onEnableMicrophone={handleEnableMicrophone}
                    />
                  ) : null}
                </View>
              </Animated.View>
            )}
          </LayoutAnimationConfig>
        </View>
      </Animated.View>

      {/* Voice debug HUD — gated on the Advanced "Voice debug HUD" toggle so
          the user can see exactly what the pipeline is doing without leaving
          the screen. */}
      {voiceDebugEnabled && (
        <ReviewDebugHud
          insetTop={insets.top}
          modelLabel={
            voice.isReady
              ? 'ready'
              : voice.error
                ? `error: ${voice.error}`
                : `${voiceModel.state} ${Math.round(voiceModel.progress * 100)}%`
          }
          phase={voicePhase}
          debug={voiceDebug}
        />
      )}
    </View>
  );
}

const voiceDebugStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SPACING.LARGE,
    right: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    gap: LAYOUT.SPACING.HALF_TINY,
  },
  line: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
});

export default function ReviewScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromRemember = params['fromRemember'] === 'true';

  // Check if tutorial needs to be shown before starting session.
  // `shouldShowTutorial` returns false for BOTH "already seen" and "store hasn't
  // hydrated yet", so this must not be snapshotted into state before isLoaded:
  // opening review during hydration used to latch dismissed=true, and since the
  // tutorial then never rendered it was never marked complete either — it just
  // silently failed to appear, every session, forever.
  const { shouldShowTutorial, isLoaded: areTutorialsLoaded } = useTutorialContext();
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const needsTutorial = areTutorialsLoaded && shouldShowTutorial(TutorialId.REVIEW_GRADES);

  // Tutorial management
  const gradesTutorial = useTutorial(TutorialId.REVIEW_GRADES);
  const {
    dismiss: dismissGradesTutorial,
    isVisible: isGradesTutorialVisible,
    trigger,
  } = gradesTutorial;

  // Handle tutorial dismissal
  const handleTutorialDismiss = () => {
    setTutorialDismissed(true);
    dismissGradesTutorial();
  };

  // Show tutorial immediately if needed
  useEffect(() => {
    if (shouldShowTutorial(TutorialId.REVIEW_GRADES)) {
      trigger();
    }
  }, [shouldShowTutorial, trigger]);

  // The lock for the two states ReviewContent never mounts in. It holds its own
  // (see useKeepScreenAwake there), so this one covers only the gap: the
  // hydration wait, and the grades tutorial.
  //
  // The tutorial is the state that most needs it. It is multi-step reading with
  // no touches between steps, on a learner's very first session — the exact
  // shape of dwell this whole change exists for — and gating the lock inside
  // ReviewContent left it uncovered, because these two branches return before
  // ReviewContent is ever rendered. Two separate hooks rather than one lifted
  // to this component: only ReviewContent knows when the session has finished,
  // and a lock held here could not be released for the completion screen.
  const showingPreSession = !areTutorialsLoaded || (needsTutorial && !tutorialDismissed);
  useKeepScreenAwake(showingPreSession);

  // Hold until the tutorial store has hydrated, so we never start the session
  // and then pop the tutorial over it a moment later. In practice this is
  // already resolved at app root — at most a frame.
  if (!areTutorialsLoaded) {
    return <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />;
  }

  // Show tutorial with simple background if needed (before session starts)
  if (needsTutorial && !tutorialDismissed) {
    return (
      <>
        <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />
        <ReviewGradesTutorial visible={isGradesTutorialVisible} onDismiss={handleTutorialDismiss} />
      </>
    );
  }

  // After tutorial is dismissed, render the actual review session
  return <ReviewContent fromRemember={fromRemember} />;
}
