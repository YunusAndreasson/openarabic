import { useLocalSearchParams } from 'expo-router';
import React, { JSX } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { Loader } from '@/components/Loader';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

import {
  ReviewCard,
  ReviewHeader,
  CompletionScreen,
  MeaningOverlay,
  InstructionFooter,
} from '../components/review';
import { useReview } from '../hooks/useReview';

const baseStyles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
  wordArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 280,
  } as ViewStyle,
});

export default function ReviewScreen(): JSX.Element {
  const colors = useColors();
  const params = useLocalSearchParams();
  const fromVocabulary = params.fromVocabulary === 'true';

  const {
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    showInitialLoading,
    opacity,
    isComplete,
    isLoading,
    maxProgress,
    progressAnimationKey,
    wordFontSize,
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleClose,
  } = useReview({ fromVocabulary });

  if (isLoading || showInitialLoading) {
    return (
      <ThemedView style={[baseStyles.container, baseStyles.centered]} useSafeArea={true}>
        <Loader size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (isComplete || isTransitioningToCompletion) {
    return <CompletionScreen onClose={handleClose} />;
  }

  if (!currentSentence) {
    return (
      <ThemedView style={[baseStyles.container, baseStyles.centered]} useSafeArea={true}>
        <Loader size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <View style={baseStyles.contentContainer}>
        <ReviewHeader
          progress={maxProgress}
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
            isUpdating={false}
            isTransitioning={isTransitioningToCompletion}
            opacity={opacity}
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
