import { useLocalSearchParams } from 'expo-router';
import React, { JSX } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';

import {
  ReviewCard,
  ReviewHeader,
  CompletionScreen,
  MeaningOverlay,
  InstructionFooter,
} from '../components/review';
import { useReview } from '../hooks/useReview';

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
  const fromVocabulary = params.fromVocabulary === 'true';

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
  } = useReview({ fromVocabulary });

  if (isComplete || isTransitioningToCompletion) {
    return <CompletionScreen onClose={handleClose} sessionMetrics={sessionMetrics} />;
  }

  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <View style={baseStyles.contentContainer}>
        <ReviewHeader
          progress={progress}
          maxProgress={maxProgress}
          animationKey={progressAnimationKey}
          onClose={handleClose}
        />

        <View style={baseStyles.wordArea}>
          <ReviewCard
            word={currentSentence.wordForm}
            fontSize={wordFontSize}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={handleTap}
            isUpdating={isUpdating}
            isTransitioning={isTransitioningToCompletion}
            opacityStyle={animatedStyle}
          />
          <MeaningOverlay
            visible={showMeaningOverlay}
            meaning={currentMeaning}
            isWarning={!isVagueMeaning}
            isVague={isVagueMeaning}
            isStruggling={isStruggling}
          />
        </View>

        <InstructionFooter />
      </View>
    </ThemedView>
  );
}
