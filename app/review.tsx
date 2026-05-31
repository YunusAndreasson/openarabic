import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import {
  CompletionScreen,
  ReviewBottomActions,
  ReviewCard,
  ReviewHeader,
  VoiceResultPanel,
  VoiceStatusIndicator,
} from '@/components/review';
import { useTutorialContext, useVoiceGrading } from '@/components/providers';
import { SwipeGestureTutorial } from '@/components/tutorials/SwipeGestureTutorial';
import { PulsatingLoader } from '@/components/ui';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { ContextualHelpType } from '@/constants/tutorials';
import { TutorialId } from '@/constants/tutorials';
import { useReview, useVoiceReview } from '@/hooks/review';
import { useColors } from '@/hooks/theme/useColors';
import { useTutorial } from '@/hooks/tutorials/useTutorial';
import { useAppSelectorShallow } from '@/store/hooks';

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  containerCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  } as ViewStyle,
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  } as ViewStyle,
  wordArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
  } as ViewStyle,
  loadingText: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  } as TextStyle,
  loadingSubtext: {
    marginTop: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
  } as TextStyle,
  uiChromeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  } as ViewStyle,
  headerPadding: {
    paddingTop: LAYOUT.SPACING.LARGE,
  } as ViewStyle,
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

  // Contextual help state - shows specific help when tapping bottom buttons
  const [contextualHelpType, setContextualHelpType] = useState<ContextualHelpType | null>(null);

  const handleShowContextualHelp = useCallback((helpType: ContextualHelpType) => {
    setContextualHelpType(helpType);
  }, []);

  const handleDismissContextualHelp = useCallback(() => {
    setContextualHelpType(null);
  }, []);

  const {
    currentSentence,
    currentMeaning,
    showTranslation,
    isComplete,
    progress,
    maxProgress,
    currentWordKey,
    handleSwipeLeft,
    handleSwipeRight,
    handleClose,
    isUpdating,
    transparentStyle,
    sessionMetrics,
    handleReplayAudio,
    isAudioPreloading,
    audioPreloadProgress,
    isAudioPreloadingComplete,
    isLoading,
    wordQueue,
    currentWord,
    revealMeaningPassive,
    promptAudioDoneKey,
    handleVoiceUnknownResolved,
    stopAudio,
  } = useReview({ fromRemember });

  // Voice grading — when the toggle is on, auto-arms the mic after each card
  // settles. Match → silently advance as Known. Miss → reveal the meaning and
  // let the user pick Known / Unknown.
  const {
    phase: voicePhase,
    debug: voiceDebug,
    result: voiceResult,
    paused: voicePaused,
    accept: voiceAccept,
    reject: voiceReject,
    retry: voiceRetry,
    togglePause: voiceTogglePause,
  } = useVoiceReview({
    expected: currentWord?.root?.meaning ?? null,
    currentWordKey,
    promptAudioDoneKey,
    ready: !isUpdating && !isLoading && isAudioPreloadingComplete && !isComplete,
    stopAudio,
    onKnownAuto: handleSwipeRight,
    // The panel already revealed the answer — advance as Unknown without
    // re-revealing / replaying the English audio / waiting out the 3 s overlay.
    onUnknownAuto: handleVoiceUnknownResolved,
    onRevealAnswer: revealMeaningPassive,
  });

  // A wrong answer stops and shows the interactive result panel in place of the
  // standard action buttons; a correct answer just proceeds (no result).
  const voiceShowResult = voicePhase === 'result' && voiceResult !== null;
  const voice = useVoiceGrading();
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  const voiceDebugEnabled = useAppSelectorShallow(state => state.settings.voiceDebugEnabled);

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
      />
    );
  }

  // Show beautiful loader while practice session is loading words or initializing
  // This takes precedence over audio preloading during initial load
  if (isLoading || isInitializing) {
    return <ReviewLoadingState message={STRINGS.PREPARING_PRACTICE_SESSION} />;
  }

  // Show audio preloading indicator (only when not in initial loading phase)
  if (isAudioPreloading) {
    return (
      <ReviewLoadingState
        message={STRINGS.LOADING_AUDIO_ELLIPSIS}
        progress={audioPreloadProgress}
        successMessage={isAudioPreloadingComplete ? STRINGS.AUDIO_READY : undefined}
      />
    );
  }

  return (
    <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
      {/* Full-screen swipe background + word content */}
      <ReviewCard
        wordKey={currentWordKey}
        word={currentSentence.wordForm}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        opacityStyle={transparentStyle}
        isUpdating={isUpdating}
        testID="review-card"
        translation={currentMeaning}
        showTranslation={showTranslation}
        onReplayAudio={handleReplayAudio}
        fullScreenBackground={true}
      />

      {/* UI chrome - header and bottom actions, positioned above background */}
      <View style={baseStyles.uiChromeOverlay}>
        {/* Progress header at top of screen */}
        <View
          style={[
            baseStyles.headerPadding,
            Platform.OS === 'android' && { paddingTop: insets.top },
          ]}
        >
          <ReviewHeader
            maxProgress={maxProgress}
            progress={progress}
            onClose={handleClose}
            showVoiceControl={voiceEnabled}
            voicePaused={voicePaused}
            onToggleVoice={voiceTogglePause}
          />
        </View>

        {/* Bottom actions */}
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + LAYOUT.SPACING.LARGE,
            left: LAYOUT.SPACING.LARGE,
            right: LAYOUT.SPACING.LARGE,
          }}
        >
          {voiceShowResult && voiceResult ? (
            <VoiceResultPanel
              result={voiceResult}
              onAccept={voiceAccept}
              onReject={voiceReject}
              onRetry={voiceRetry}
            />
          ) : (
            <ReviewBottomActions
              onPressLeft={handleSwipeLeft}
              onPressRight={handleSwipeRight}
              onShowContextualHelp={handleShowContextualHelp}
              disabled={isUpdating}
              voiceHint={
                voiceDebug.match
                  ? voiceDebug.match.matched
                    ? 'known'
                    : 'unknown'
                  : null
              }
            />
          )}
        </View>
      </View>

      {/* Voice status — pill above the bottom buttons so the learner can
          clearly tell when we're listening vs grading. Hidden while the
          wrong-answer panel owns the slot (voiceShowResult) and while a card
          advance is in flight (isUpdating), so a transient phase can't flash
          during the hand-off to the next card. */}
      {!voiceShowResult && !isUpdating && (
        <View
          pointerEvents="none"
          style={[
            voiceHintStyles.container,
            {
              bottom:
                insets.bottom +
                LAYOUT.SPACING.LARGE +
                LAYOUT.BUTTON.HEIGHT.LARGE +
                LAYOUT.SPACING.MEDIUM,
            },
          ]}
        >
          <VoiceStatusIndicator phase={voicePhase} />
        </View>
      )}

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
        </View>
      )}

      {/* Contextual help overlay - shown when tapping bottom buttons */}
      <SwipeGestureTutorial
        visible={contextualHelpType !== null}
        onDismiss={handleDismissContextualHelp}
        contextualHelp={contextualHelpType ?? undefined}
      />
    </View>
  );
}

const voiceHintStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  } as ViewStyle,
});

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
  } as ViewStyle,
  line: {
    fontSize: 11,
    lineHeight: 14,
  } as TextStyle,
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
