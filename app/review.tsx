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
} from '@/components/review';
import { useTutorialContext } from '@/components/providers';
import { SwipeGestureTutorial } from '@/components/tutorials/SwipeGestureTutorial';
import { PulsatingLoader } from '@/components/ui';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { ContextualHelpType } from '@/constants/tutorials';
import { TutorialId } from '@/constants/tutorials';
import { useReview } from '@/hooks/review';
import { useColors } from '@/hooks/theme/useColors';
import { useTutorial } from '@/hooks/tutorials/useTutorial';

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
  } = useReview({ fromRemember });

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
          <ReviewHeader maxProgress={maxProgress} progress={progress} onClose={handleClose} />
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
          <ReviewBottomActions
            onPressLeft={handleSwipeLeft}
            onPressRight={handleSwipeRight}
            onShowContextualHelp={handleShowContextualHelp}
            disabled={isUpdating}
          />
        </View>
      </View>

      {/* Contextual help overlay - shown when tapping bottom buttons */}
      <SwipeGestureTutorial
        visible={contextualHelpType !== null}
        onDismiss={handleDismissContextualHelp}
        contextualHelp={contextualHelpType ?? undefined}
      />
    </View>
  );
}

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
