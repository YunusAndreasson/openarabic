import { useLocalSearchParams } from 'expo-router';
import React from 'react';
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
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleClose,
  } = useReview({ fromVocabulary });

  // Show loading screen during initial load
  if (isLoading || showInitialLoading) {
    return (
      <ThemedView style={[baseStyles.container, baseStyles.centered]} useSafeArea={true}>
        <Loader size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  // Show completion screen if all words are reviewed or if there are no words to review
  if (isComplete) {
    // Only continue with the main content during the transition animation
    if (isTransitioningToCompletion) {
      // The opacity animation will handle the fade out
      // Continue to the main return below
    } else {
      // Otherwise show the completion screen
      return <CompletionScreen onClose={handleClose} />;
    }
  }

  // Return the main content with entrance animation
  return (
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <View style={baseStyles.contentContainer}>
        {/* Show loading state during initial load */}
        {showInitialLoading ? (
          <Loader />
        ) : isComplete ? (
          <CompletionScreen onClose={handleClose} />
        ) : (
          <>
            {/* Header with progress bar */}
            <ReviewHeader
              progress={maxProgress}
              maxProgress={maxProgress}
              animationKey={progressAnimationKey}
              onClose={handleClose}
            />

            {/* Word display area with meaning overlay */}
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
              {/* Position MeaningOverlay within the word area */}
              <MeaningOverlay
                visible={showMeaningOverlay}
                meaning={currentMeaning}
                isWarning={!isVagueMeaning}
                isVague={isVagueMeaning}
              />
            </View>

            {/* Footer with instructions */}
            <InstructionFooter primaryText="Tap on a word to see its meaning. Long press to add to your vocabulary." />
          </>
        )}
      </View>
    </ThemedView>
  );
}
