import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import type { ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import {
  CompletionScreen,
  ReviewBottomActions,
  ReviewCard,
  ReviewHeader,
} from '@/components/review';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useReview } from '@/hooks/review';
import { useColors } from '@/hooks/theme/useColors';

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

export default function ReviewScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromRemember = params['fromRemember'] === 'true';
  const mode = params['mode'] as string | undefined;
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const {
    currentSentence,
    currentMeaning,
    currentWord,
    showTranslation,
    isTransitioningToCompletion,
    isComplete,
    progress,
    maxProgress,
    progressAnimationKey,
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
    isAudioPreloading,
    audioPreloadProgress,
    isAudioPreloadingComplete,
  } = useReview({ fromRemember, mode });

  if (isComplete || isTransitioningToCompletion) {
    return (
      <CompletionScreen
        sessionMetrics={sessionMetrics}
        testID="completion-screen"
        fromRemember={fromRemember}
      />
    );
  }

  // Show audio preloading indicator
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
          <View style={baseStyles.wordArea}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText
              style={{
                marginTop: LAYOUT.SPACING.MEDIUM,
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
                textAlign: 'center',
              }}
            >
              Loading audio...
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
                Audio ready
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[baseStyles.container, { backgroundColor: colors.background }]}>
      {/* Progress header at top of screen */}
      <View style={{ paddingTop: LAYOUT.SPACING.LARGE }}>
        <ReviewHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
        />
      </View>

      {/* Main content area */}
      <View
        style={[
          baseStyles.contentContainer,
          {
            paddingTop: LAYOUT.SPACING.MEDIUM, // Less padding since header is above
            paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
          },
        ]}
      >
        <View style={baseStyles.wordArea}>
          <ReviewCard
            key={currentWordKey}
            word={currentSentence.wordForm}
            currentWord={currentWord}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            opacityStyle={transparentStyle}
            isUpdating={isUpdating}
            isTransitioning={isTransitioningToCompletion}
            testID="review-card"
            translation={currentMeaning}
            showTranslation={showTranslation}
            onHesitationStart={handleHesitationStart}
            onHesitationEnd={handleHesitationEnd}
            isHesitating={isHesitating}
          />
        </View>

        <ReviewBottomActions />
      </View>
    </View>
  );
}
