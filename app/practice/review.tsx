import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CompletionScreen,
  MeaningOverlay,
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
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    isComplete,
    progress,
    maxProgress,
    progressAnimationKey,
    wordFontSize,
    currentWordKey,
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleClose,
    isUpdating,
    animatedStyle,
    sessionMetrics,
  } = useReview({ fromRemember, mode });

  if (isComplete || isTransitioningToCompletion) {
    return (
      <CompletionScreen
        sessionMetrics={sessionMetrics}
        onClose={handleClose}
        testID="completion-screen"
      />
    );
  }

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
        <ReviewHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
        />

        <View style={baseStyles.wordArea}>
          <ReviewCard
            key={currentWordKey}
            fontSize={wordFontSize}
            isTransitioning={isTransitioningToCompletion}
            isUpdating={isUpdating}
            opacityStyle={animatedStyle}
            testID="review-card"
            word={currentSentence.wordForm}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
          <MeaningOverlay
            isStruggling={isStruggling}
            isVague={isVagueMeaning}
            isWarning={!isVagueMeaning}
            meaning={currentMeaning}
            visible={showMeaningOverlay}
          />
        </View>

        <ReviewBottomActions />
      </View>
    </View>
  );
}


