import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Toast } from '@/components/Toast';
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
import { TutorialId } from '@/constants/tutorials';
import { ToastType } from '@/types/enums';
import { useReview, ReviewToastContext } from '@/hooks/review';
import { useColors } from '@/hooks/theme/useColors';
import { useTutorial } from '@/hooks/tutorials/useTutorial';

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,

  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
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
});

// Main review content component (only rendered after tutorial is dismissed)
function ReviewContent({ fromRemember }: { fromRemember: boolean }): JSX.Element {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // Local toast state for the review screen (modal)
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    duration: number;
    type: ToastType;
  }>({
    visible: false,
    message: '',
    duration: 3000,
    type: ToastType.INFO,
  });

  const showLocalToast = useCallback(
    (message: string, duration: number = 3000, type: ToastType = ToastType.INFO) => {
      setToastState({ visible: true, message, duration, type });
    },
    [],
  );

  const handleToastClose = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }));
  }, []);

  const toastContextValue = useMemo(() => ({ showToast: showLocalToast }), [showLocalToast]);

  const {
    currentSentence,
    currentMeaning,
    currentWord,
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
    isHesitating,
    handleHesitationStart,
    handleHesitationEnd,
    handleReplayAudio,
    isAudioPreloading,
    audioPreloadProgress,
    isAudioPreloadingComplete,
    isLoading,
    wordQueue,
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
    return (
      <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
        <View style={[baseStyles.contentContainer, { justifyContent: 'center' }]}>
          <PulsatingLoader size={64} />
          <ThemedText
            style={{
              marginTop: LAYOUT.SPACING.MEDIUM,
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
              textAlign: 'center',
            }}
          >
            {STRINGS.PREPARING_PRACTICE_SESSION}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Show audio preloading indicator (only when not in initial loading phase)
  if (isAudioPreloading) {
    return (
      <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            baseStyles.contentContainer,
            {
              paddingTop: insets.top + LAYOUT.SPACING.MEDIUM,
              paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
            },
          ]}
        >
          <View style={[baseStyles.wordArea, { alignItems: 'center' }]}>
            <PulsatingLoader size={64} />
            <ThemedText
              style={{
                marginTop: LAYOUT.SPACING.MEDIUM,
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
                textAlign: 'center',
              }}
            >
              {STRINGS.LOADING_AUDIO_ELLIPSIS}
            </ThemedText>
            <ThemedText
              style={{
                marginTop: LAYOUT.SPACING.SMALL,
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
                textAlign: 'center',
                color: colors.secondaryText,
              }}
            >
              {Math.round(audioPreloadProgress)}% complete
            </ThemedText>
            {isAudioPreloadingComplete && (
              <ThemedText
                style={{
                  marginTop: LAYOUT.SPACING.MEDIUM,
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
                  textAlign: 'center',
                  color: colors.success,
                }}
              >
                {STRINGS.AUDIO_READY}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <ReviewToastContext value={toastContextValue}>
      <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
        {/* Full-screen swipe background + word content */}
        <ReviewCard
          key={currentWordKey}
          word={currentSentence.wordForm}
          currentWord={currentWord}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          opacityStyle={transparentStyle}
          isUpdating={isUpdating}
          testID="review-card"
          translation={currentMeaning}
          showTranslation={showTranslation}
          onHesitationStart={handleHesitationStart}
          onHesitationEnd={handleHesitationEnd}
          isHesitating={isHesitating}
          onWordPress={handleReplayAudio}
          fullScreenBackground={true}
        />

        {/* UI chrome - header and bottom actions, positioned above background */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'box-none',
          }}
        >
          {/* Progress header at top of screen */}
          <View style={{ paddingTop: LAYOUT.SPACING.XLARGE }}>
            <ReviewHeader maxProgress={maxProgress} progress={progress} onClose={handleClose} />
          </View>

          {/* Bottom actions */}
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
              left: LAYOUT.SCREEN_EDGE_PADDING,
              right: LAYOUT.SCREEN_EDGE_PADDING,
            }}
          >
            <ReviewBottomActions />
          </View>
        </View>
      </View>

      {/* Local toast for modal - appears on top with maximum z-index */}
      {toastState.visible && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: LAYOUT.Z_INDEX.TOP_OVERLAY,
            pointerEvents: 'box-none',
          }}
        >
          <Toast
            visible={toastState.visible}
            message={toastState.message}
            duration={toastState.duration}
            type={toastState.type}
            onClose={handleToastClose}
          />
        </View>
      )}
    </ReviewToastContext>
  );
}

export default function ReviewScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromRemember = params['fromRemember'] === 'true';
  const colors = useColors();

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
      <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
        <View style={[baseStyles.contentContainer, { justifyContent: 'center' }]}>
          <PulsatingLoader size={64} />
          <ThemedText
            style={{
              marginTop: LAYOUT.SPACING.MEDIUM,
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
              textAlign: 'center',
            }}
          >
            {STRINGS.PREPARING_PRACTICE_SESSION}
          </ThemedText>
        </View>
        <SwipeGestureTutorial visible={swipeTutorial.isVisible} onDismiss={handleTutorialDismiss} />
      </View>
    );
  }

  // After tutorial is dismissed, render the actual review session
  return <ReviewContent fromRemember={fromRemember} />;
}
