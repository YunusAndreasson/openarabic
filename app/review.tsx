import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import type { ReviewCardHandle } from '@/components/review/ReviewFlipCard';
import {
  CompletionScreen,
  ReviewContextSentence,
  ReviewFlipCard,
  ReviewGradeBar,
  ReviewHeader,
  VoiceChannel,
  VoiceResultPanel,
} from '@/components/review';
import { useTutorialContext, useVoiceGrading } from '@/components/providers';
import type { WordConfidence } from '@/types/review.types';
import { SwipeGestureTutorial } from '@/components/tutorials/SwipeGestureTutorial';
import { PulsatingLoader } from '@/components/ui';
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
  voiceSlot: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  // Full-width reveal button — neutral card surface, tinted label. Matches the
  // grade bar's height so the bottom slot doesn't jump between the two states.
  showAnswerButton: {
    width: '100%',
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  showAnswerLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
});

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
    promptAudioDoneKey,
    stopAudio,
    remainingDueCount,
    startNextChunk,
    playSentenceAudio,
    restudying,
    continueFromRestudy,
  } = useReview({ fromRemember });

  // One example sentence per word in the chunk, fetched once and never on the
  // per-card path. Non-blocking: a card renders without it and picks it up when
  // it lands, so a slow or failed lookup can never hold up a session.
  const examples = useReviewExamples(wordQueue);
  const currentExample = currentWord ? (examples.get(currentWord.root_id) ?? null) : null;

  // Voice grading — when the toggle is on, auto-arms the mic after each card
  // settles. Correct match → silently advance as "Knew it". Miss → play the
  // English audio + show the result panel (transcript + answer + Yes/No/Retry);
  // the panel is the answer surface for voice, so the card is NOT flipped (a
  // retry stays clean on the question face).
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
    promptAudioDoneKey,
    // Stop listening once the answer is revealed — the recall test is over.
    ready: !isUpdating && !isLoading && isAudioReady && !isComplete && !revealed,
    stopAudio,
    // Correct match → silently advance as "Knew it" (speaking the answer is the
    // proof; fromVoice bypasses the reveal guard).
    onKnownAuto: () => grade('known', { fromVoice: true }),
    // Voice result panel "No, I missed it" → Forgot.
    onUnknownAuto: () => grade('unknown', { fromVoice: true }),
    // Miss → play the English audio (the panel shows the answer text + override).
    onRevealAnswer: revealMeaningPassive,
  });

  // A wrong answer stops and shows the interactive result panel in place of the
  // standard action buttons; a correct answer just proceeds (no result).
  const voiceShowResult = voicePhase === 'result' && voiceResult !== null;
  const voice = useVoiceGrading();
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);

  // Live pipeline numbers for the debug HUD. Comes through the store hook
  // rather than a getter call in render — see ReviewDiagSnapshot for why.
  const diag = useSyncExternalStore(subscribeDiag, getDiagSnapshot, getDiagSnapshot);

  // Stable identities: these feed the pan gesture's config, and an inline arrow
  // rebuilt the whole Gesture object on every render of the screen (voice phase
  // ticks, audio status, progress) — re-attaching handlers mid-drag.
  //
  // No haptic here: the swipe already fired its detent tick the moment the drag
  // crossed the commit threshold (see ReviewFlipCard). Firing again on release
  // would double-buzz a single grade — and the tick at the threshold is the one
  // that carries information, because it lands while the user can still change
  // their mind.
  const handleSwipeForgot = useCallback(() => grade('unknown'), [grade]);
  const handleSwipeKnewIt = useCallback(() => grade('known'), [grade]);

  // A tapped grade drives the card's exit before committing, so the two input
  // paths produce the same motion: Forgot leaves left, Knew it leaves right,
  // both on the swipe's own CARD_EXIT timing and colour ramp. "Guessed" has no
  // direction (and deliberately no swipe), so it keeps the plain dissolve —
  // that difference is the affordance, not an oversight.
  //
  // "Forgot" from the bar never exits here: it opens a restudy hold, so the
  // card is staying put and throwing it off screen would be a lie. Its left
  // exit is deferred to the tap that leaves the hold, below.
  const cardRef = useRef<ReviewCardHandle>(null);
  const handleGradeFromBar = useCallback(
    (confidence: WordConfidence) => {
      if (confidence === 'known') cardRef.current?.commitTo('right');
      grade(confidence);
    },
    [grade],
  );

  // Leaving the restudy hold is the moment the "Forgot" actually commits, so
  // that is where its exit belongs.
  const handleRestudyContinue = useCallback(() => {
    cardRef.current?.commitTo('left');
    continueFromRestudy();
  }, [continueFromRestudy]);

  // Track if review session is still initializing (first word not yet loaded)
  const isInitializing = useMemo(() => {
    return isLoading || (wordQueue.length === 0 && !isComplete && currentWord === null);
  }, [isLoading, wordQueue.length, isComplete, currentWord]);

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
  if (isLoading || isInitializing) {
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
          revealed={revealed}
          onReveal={revealAnswer}
          onReplayAudio={handleReplayAudio}
          opacityStyle={transparentStyle}
          isUpdating={isUpdating}
          onSwipeForgot={handleSwipeForgot}
          onSwipeKnewIt={handleSwipeKnewIt}
          testID="review-card"
          restudying={restudying}
          onRestudyContinue={handleRestudyContinue}
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
          // Voice now lives inside the card it belongs to, instead of floating
          // between the card and the buttons. Suppressed while the wrong-answer
          // panel owns the decision and during an advance, so a transient phase
          // can't flash during the hand-off to the next card.
          //
          // Interactive, unlike the status label it replaced: this is where the
          // learner skips the prompt or holds to take the mic, so it must
          // receive touches. Its own Pressable wins over the question face's
          // tap-to-reveal, which is the intent — the strip is the mic control.
          questionSlot={
            voiceEnabled && !voiceShowResult && !isUpdating ? (
              <View style={baseStyles.voiceSlot}>
                <VoiceChannel
                  phase={voicePhase}
                  level={voice.micLevel}
                  promptPlaying={promptAudioDoneKey !== currentWordKey}
                  paused={voicePaused}
                  onSpeakNow={voiceSpeakNow}
                  onStopSpeaking={voiceStopSpeaking}
                />
              </View>
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
        {restudying ? (
          // A forgotten card holds here instead of advancing. The whole card is
          // the tap target (see onRestudyContinue on ReviewFlipCard), so this is
          // a prompt rather than a button — one easy tap anywhere, no aiming.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={STRINGS.RESTUDY_CONTINUE}
            onPress={handleRestudyContinue}
            style={({ pressed }) => [
              baseStyles.showAnswerButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? LAYOUT.OPACITY.PRESSED : LAYOUT.OPACITY.FULL,
              },
            ]}
          >
            <ThemedText
              skipDefaultColor
              weight="semibold"
              style={[baseStyles.showAnswerLabel, { color: colors.tint }]}
            >
              {STRINGS.RESTUDY_CONTINUE}
            </ThemedText>
          </Pressable>
        ) : voiceShowResult && voiceResult ? (
          <VoiceResultPanel
            result={voiceResult}
            onAccept={voiceAccept}
            onReject={voiceReject}
            onRetry={voiceRetry}
          />
        ) : revealed ? (
          <ReviewGradeBar
            intervals={intervalLabels}
            onGrade={handleGradeFromBar}
            disabled={isUpdating}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={STRINGS.SHOW_ANSWER}
            onPress={revealAnswer}
            disabled={isUpdating}
            style={({ pressed }) => [
              baseStyles.showAnswerButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                // Press feedback only — the transient isUpdating dim is now
                // carried by the container's shared fade (see above).
                opacity: pressed ? LAYOUT.OPACITY.PRESSED : LAYOUT.OPACITY.FULL,
              },
            ]}
          >
            <ThemedText
              skipDefaultColor
              weight="semibold"
              style={[baseStyles.showAnswerLabel, { color: colors.tint }]}
            >
              {STRINGS.SHOW_ANSWER}
            </ThemedText>
          </Pressable>
        )}
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
            {`model: ${voice.isReady ? 'ready' : voice.error ? `error: ${voice.error}` : `dl ${Math.round((voice.downloadProgress ?? 0) * 100)}%`}`}
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

  // Handle tutorial dismissal
  const handleTutorialDismiss = () => {
    setTutorialDismissed(true);
    swipeTutorial.dismiss();
  };

  // Show tutorial immediately if needed
  useEffect(() => {
    if (shouldShowTutorial(TutorialId.SWIPE_GESTURE)) {
      swipeTutorial.trigger();
    }
  }, []); // Only trigger once on mount

  // Show tutorial with simple background if needed (before session starts)
  if (!tutorialDismissed) {
    return (
      <>
        <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />
        <SwipeGestureTutorial visible={swipeTutorial.isVisible} onDismiss={handleTutorialDismiss} />
      </>
    );
  }

  // After tutorial is dismissed, render the actual review session
  return <ReviewContent fromRemember={fromRemember} />;
}
