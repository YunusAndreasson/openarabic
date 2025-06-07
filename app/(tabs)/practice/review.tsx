import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import {
  ReviewCard,
  ReviewHeader,
  CompletionScreen,
  MeaningOverlay,
  InstructionFooter,
} from '@/components/review';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useReview } from '@/hooks/review';

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: 0,
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
  const fromRemember = params.fromRemember === 'true';

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
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleClose,
    isUpdating,
    animatedStyle,
    sessionMetrics,
  } = useReview({ fromRemember });

  if (isComplete || isTransitioningToCompletion) {
    return <CompletionScreen sessionMetrics={sessionMetrics} onClose={handleClose} />;
  }

  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <View style={baseStyles.contentContainer}>
        <ReviewHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
        />

        <View style={baseStyles.wordArea}>
          <ReviewCard
            fontSize={wordFontSize}
            isTransitioning={isTransitioningToCompletion}
            isUpdating={isUpdating}
            opacityStyle={animatedStyle}
            word={currentSentence.wordForm}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={handleTap}
          />
          <MeaningOverlay
            isStruggling={isStruggling}
            isVague={isVagueMeaning}
            isWarning={!isVagueMeaning}
            meaning={currentMeaning}
            visible={showMeaningOverlay}
          />
        </View>

        <InstructionFooter />
      </View>
    </ThemedView>
  );
}
