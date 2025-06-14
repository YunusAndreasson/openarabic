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
import WordManagementModal from '@/components/vocabulary/WordManagementModal';
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
    currentWordKey,
    isVagueMeaning,
    isStruggling,
    handleSwipeLeft,
    handleSwipeRight,
    handleTap,
    handleLongPress,
    handleClose,
    isUpdating,
    animatedStyle,
    sessionMetrics,
    // Word management
    isWordManagementVisible,
    selectedWordForManagement,
    hideWordManagement,
    handleRemoveFromStudy,
    handleResetProgress,
    handleSkipForToday,
    handleMarkAsEasy,
    handleMarkAsHard,
  } = useReview({ fromRemember });

  // Check if we have a current word to show the management icon
  const hasCurrentWord = Boolean(
    currentSentence.wordForm && !isComplete && !isTransitioningToCompletion
  );

  // Handle management icon press - use the same logic as long press
  const handleManageWord = () => {
    if (hasCurrentWord) {
      handleLongPress();
    }
  };

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
    <ThemedView style={baseStyles.container} useSafeArea={true}>
      <View style={baseStyles.contentContainer}>
        <ReviewHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          onManageWord={handleManageWord}
          hasCurrentWord={hasCurrentWord}
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
            onTap={handleTap}
            onLongPress={handleLongPress}
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

      {/* Word Management Modal */}
      <WordManagementModal
        visible={isWordManagementVisible}
        word={selectedWordForManagement}
        onClose={hideWordManagement}
        onRemoveFromStudy={handleRemoveFromStudy}
        onResetProgress={handleResetProgress}
        onSkipForToday={handleSkipForToday}
        onMarkAsEasy={handleMarkAsEasy}
        onMarkAsHard={handleMarkAsHard}
      />
    </ThemedView>
  );
}
