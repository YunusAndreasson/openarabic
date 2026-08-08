import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import type { ReviewCardHandle } from '@/components/review/ReviewFlipCard';
import {
  CompletionScreen,
  ReviewActionButton,
  ReviewContextSentence,
  ReviewFlipCard,
  ReviewGradeBar,
  ReviewHeader,
  VoiceAnswerButton,
  voiceButtonMode,
  VoiceListeningIndicator,
  voiceIndicatorState,
  VoiceResultPanel,
} from '@/components/review';
import { useTutorialContext, useVoiceGrading } from '@/components/providers';
import type { WordConfidence } from '@/types/review.types';
import { SwipeGestureTutorial } from '@/components/tutorials/SwipeGestureTutorial';
import { PulsatingLoader } from '@/components/ui';
import { TIMING_CONFIG, VERDICT } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TutorialId } from '@/constants/tutorials';
import { useReview, useReviewExamples, useVoiceReview } from '@/hooks/review';
import { useColors } from '@/hooks/theme/useColors';
import { useTutorial } from '@/hooks/tutorials/useTutorial';
import { useAppSelectorShallow } from '@/store/hooks';
import { getDiagSnapshot, setDiagnosticsEnabled, subscribeDiag } from '@/utils/reviewDiagnostics';

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
  cardArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  bottomSlot: {
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
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

// Main review content component (only rendered after tutorial is dismissed)
function ReviewContent({ fromRemember }: { fromRemember: boolean }): JSX.Element {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const voiceDebugEnabled = useAppSelectorShallow(state => state.settings.voiceDebugEnabled);

  // Arm the pipeline timeline BEFORE useReview opens its session below — an
  // effect would run too late and the session would never start. Writing a
  // module boolean is idempotent, so a double render is harmless.
  setDiagnosticsEnabled(__DEV__ || voiceDebugEnabled);

  // Read before useReview: the review hook takes `setPlaybackPriority` from
  // here so the Arabic prompt can claim a full-volume playback session.
  const voice = useVoiceGrading();
  const {
    currentSentence,
    currentMeaning,
    revealed,
    isComplete,
    progress,
    maxProgress,
    currentWordKey,
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
    currentWord,
    revealMeaningPassive,
    stopAudio,
    remainingDueCount,
    startNextChunk,
    playSentenceAudio,
    restudying,
    continueFromRestudy,
  } = useReview({ fromRemember, setPlaybackPriority: voice.setPlaybackPriority });

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
   * `known` additionally leaves to the right, the same throw a swipe gives it,
   * with the beat in front of it on every path but the swipe's own.
   * "Guessed" keeps its plain dissolve: it has no direction and deliberately no
   * swipe, and that difference is the affordance.
   */
  const cardRef = useRef<ReviewCardHandle>(null);
  const gradeWithVerdict = useCallback(
    (confidence: WordConfidence, opts: { fromVoice?: boolean; skipBeat?: boolean } = {}) => {
      if (!grade(confidence, opts)) return;
      cardRef.current?.playVerdict(confidence);
      if (confidence === 'known') {
        cardRef.current?.commitTo('right', opts.skipBeat ? 0 : VERDICT.BEAT);
      }
    },
    [grade],
  );

  // One example sentence per word in the chunk, fetched once and never on the
  // per-card path. Non-blocking: a card renders without it and picks it up when
  // it lands, so a slow or failed lookup can never hold up a session.
  const examples = useReviewExamples(wordQueue);
  const currentExample = currentWord ? (examples.get(currentWord.root_id) ?? null) : null;

  // Voice grading — when the toggle is on, the action band carries a
  // tap-to-speak button next to "Show answer", and the mic opens only when the
  // learner presses it. Correct match → advance as "Knew it". Miss → mark the
  // card wrong on the spot, play the English audio, and show the result row
  // (transcript + answer + Missed it/Try again/Got it); that row is the answer
  // surface for voice, so the card is NOT flipped (a retry stays clean on the
  // question face).
  const {
    phase: voicePhase,
    debug: voiceDebug,
    result: voiceResult,
    paused: voicePaused,
    accept: voiceAccept,
    reject: voiceReject,
    retry: voiceRetry,
    togglePause: voiceTogglePause,
    speakNow: voiceSpeakNow,
    stopSpeaking: voiceStopSpeaking,
  } = useVoiceReview({
    expected: currentWord?.root?.meaning ?? null,
    currentWordKey,
    rootId: currentWord?.root_id ?? null,
    // Stop listening once the answer is revealed — the recall test is over.
    ready: !isUpdating && !isLoading && isAudioReady && !isComplete && !revealed,
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
  // the action ("Tap to answer" / "Done"), the CARD is the state (a meter that
  // breathes while the mic opens and moves once it is live). Both are null far
  // more often than not — a paused, refused or still-loading recognizer offers
  // nothing and says nothing, and "Show answer" simply takes the whole row.
  //
  // Suppressed during an advance so a transient phase can't flash while the
  // next card is handed over.
  const voiceMode = voiceEnabled && !isUpdating ? voiceButtonMode(voicePhase, voicePaused) : null;
  const indicatorState =
    voiceEnabled && !isUpdating ? voiceIndicatorState(voicePhase, voicePaused) : null;

  // Live pipeline numbers for the debug HUD. Comes through the store hook
  // rather than a getter call in render — see ReviewDiagSnapshot for why.
  const diag = useSyncExternalStore(subscribeDiag, getDiagSnapshot, getDiagSnapshot);

  // Stable identities: these feed the pan gesture's config, and an inline arrow
  // rebuilt the whole Gesture object on every render of the screen (voice phase
  // ticks, audio status, progress) — re-attaching handlers mid-drag.
  //
  // `skipBeat` drops the verdict beat. The throw is the beat: the card has been
  // tinting and tilting under the finger the whole way and is now leaving in the
  // direction of the decision, so parking it at the threshold first would stall
  // a gesture that is already saying everything the beat exists to say.
  const handleSwipeForgot = useCallback(
    () => gradeWithVerdict('unknown', { skipBeat: true }),
    [gradeWithVerdict],
  );
  const handleSwipeKnewIt = useCallback(
    () => gradeWithVerdict('known', { skipBeat: true }),
    [gradeWithVerdict],
  );

  // A tapped grade produces the same motion as the swipe — Knew it leaves right
  // on the same CARD_EXIT timing and colour ramp — with the beat in front of it
  // because a tap gave the card no movement of its own.
  //
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

  if (isComplete && !isUpdating) {
    return (
      <CompletionScreen
        sessionMetrics={sessionMetrics}
        testID="completion-screen"
        fromRemember={fromRemember}
        remainingDueCount={remainingDueCount}
        onReviewMore={startNextChunk}
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
        <ReviewHeader
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
          showVoiceControl={voiceEnabled}
          voicePaused={voicePaused}
          voiceListening={voicePhase === 'listening'}
          onToggleVoice={voiceTogglePause}
          recallRun={sessionMetrics.currentStreak}
        />
      </View>

      <View style={baseStyles.cardArea}>
        <ReviewFlipCard
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
          onReplayAudio={() => void handleReplayAudio()}
          opacityStyle={transparentStyle}
          isUpdating={isUpdating}
          onSwipeForgot={handleSwipeForgot}
          onSwipeKnewIt={handleSwipeKnewIt}
          testID="review-card"
          restudying={restudying}
          onRestudyContinue={handleRestudyContinue}
          listeningSlot={
            indicatorState ? (
              <VoiceListeningIndicator state={indicatorState} level={voice.micLevel} />
            ) : null
          }
          answerSlot={
            currentExample ? (
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
        <View style={baseStyles.actionSlot}>
          {restudying ? (
            // A forgotten card holds here instead of advancing. The whole card
            // is the tap target (see onRestudyContinue on ReviewFlipCard), so
            // this is a prompt rather than a button — one easy tap anywhere, no
            // aiming.
            <Animated.View
              key="restudy"
              entering={ACTION_ENTERING}
              exiting={ACTION_EXITING}
              style={baseStyles.actionState}
            >
              <View style={baseStyles.actionRow}>
                <ReviewActionButton
                  label={STRINGS.RESTUDY_CONTINUE}
                  color={colors.tint}
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
                result={voiceResult}
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
            // The two ways to answer a card, side by side, in the one place
            // this screen puts things you can do. The mic used to sit on the
            // card and "Show answer" below it — two invitations, two shapes,
            // two places, and no way to see them as alternatives.
            //
            // Two peers now: same height, same shape, one line of text each,
            // no glyphs. There is no line of copy above them either — the pair
            // is the whole instruction, and everything that used to be written
            // here ("Tap when you're done") was explaining a control that can
            // show it instead.
            <Animated.View
              key="reveal"
              entering={ACTION_ENTERING}
              exiting={ACTION_EXITING}
              style={baseStyles.actionState}
            >
              <View style={baseStyles.actionRow}>
                <ReviewActionButton
                  label={STRINGS.SHOW_ANSWER}
                  // Neutral against the mic's tint: when voice is on, speaking
                  // is the exercise and revealing is the way out of it.
                  color={colors.secondaryText}
                  disabled={isUpdating}
                  onPress={revealAnswer}
                />
                {voiceMode ? (
                  <VoiceAnswerButton
                    mode={voiceMode}
                    onSpeakNow={voiceSpeakNow}
                    onStopSpeaking={voiceStopSpeaking}
                  />
                ) : null}
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Voice debug HUD — gated on the Advanced "Voice debug HUD" toggle so
          the user can see exactly what the pipeline is doing without leaving
          the screen. */}
      {voiceDebugEnabled && (
        <View
          pointerEvents="none"
          style={[voiceDebugStyles.container, { top: insets.top + LAYOUT.SPACING.LARGE * 2 }]}
        >
          <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
            {`model: ${voice.isReady ? 'ready' : voice.error ? `error: ${voice.error}` : `dl ${Math.round(voice.downloadProgress * 100)}%`}`}
          </ThemedText>
          <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
            {`phase: ${voicePhase}`}
          </ThemedText>
          {voiceDebug.recorder && (
            <>
              <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
                {`rec: ${voiceDebug.recorder.stopReason} @${voiceDebug.recorder.stopDecidedAtMs}ms · dur ${voiceDebug.recorder.durationMs}ms · ${voiceDebug.recorder.bufferCount}buf · 1st ${voiceDebug.recorder.firstBufferMs ?? 'never'}ms`}
              </ThemedText>
              <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
                {`peak ${voiceDebug.recorder.peakRms.toFixed(5)} · ${voiceDebug.recorder.heardSpeech ? 'speech' : 'silent'}`}
              </ThemedText>
            </>
          )}
          {voiceDebug.transcript.length > 0 && (
            <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
              {`heard: "${voiceDebug.transcript}"`}
            </ThemedText>
          )}
          {voiceDebug.match && (
            <ThemedText colorName="textTertiary" type="caption" style={voiceDebugStyles.line}>
              {`match: ${voiceDebug.match.matched ? '✓' : '✗'} ${voiceDebug.match.method} · sim ${voiceDebug.match.similarity.toFixed(2)} · expected "${voiceDebug.match.expected}"`}
            </ThemedText>
          )}
          {voiceDebug.armError && (
            <ThemedText colorName="error" type="caption" style={voiceDebugStyles.line}>
              {`arm error: ${voiceDebug.armError}`}
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
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 2,
  },
  line: {
    fontSize: 11,
    lineHeight: 14,
  },
});

export default function ReviewScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromRemember = params['fromRemember'] === 'true';

  // Check if tutorial needs to be shown before starting session
  const { shouldShowTutorial } = useTutorialContext();
  const [tutorialDismissed, setTutorialDismissed] = useState(
    !shouldShowTutorial(TutorialId.SWIPE_GESTURE),
  );

  // Tutorial management
  const swipeTutorial = useTutorial(TutorialId.SWIPE_GESTURE);
  const {
    dismiss: dismissSwipeTutorial,
    isVisible: isSwipeTutorialVisible,
    trigger,
  } = swipeTutorial;

  // Handle tutorial dismissal
  const handleTutorialDismiss = () => {
    setTutorialDismissed(true);
    dismissSwipeTutorial();
  };

  // Show tutorial immediately if needed
  useEffect(() => {
    if (shouldShowTutorial(TutorialId.SWIPE_GESTURE)) {
      trigger();
    }
  }, [shouldShowTutorial, trigger]);

  // Show tutorial with simple background if needed (before session starts)
  if (!tutorialDismissed) {
    return (
      <>
        <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />
        <SwipeGestureTutorial visible={isSwipeTutorialVisible} onDismiss={handleTutorialDismiss} />
      </>
    );
  }

  // After tutorial is dismissed, render the actual review session
  return <ReviewContent fromRemember={fromRemember} />;
}
