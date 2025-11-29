/**
 * Swipe gesture tutorial - supports both full onboarding and contextual help
 *
 * Full tutorial (first-time): 5 steps - Intro → Swipe Left → Swipe Right → Hint → Ready
 * Contextual help: Single step explaining specific action (reuses same step components)
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { ContextualHelpType, SwipeTutorialStep, TUTORIAL_STEP_HEIGHT } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback, successFeedback } from '@/utils/haptics';

import {
  TutorialHintStep,
  TutorialIntroStep,
  TutorialSRSStep,
  TutorialSwipeLeftStep,
  TutorialSwipeRightStep,
} from './steps';
import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';

interface SwipeGestureTutorialProps {
  visible: boolean;
  onDismiss: () => void;
  /** If set, shows only the contextual help for this action */
  contextualHelp?: ContextualHelpType;
}

// Full tutorial flow (first-time users) - reuses contextual help screens
const FULL_TUTORIAL_COMPONENTS = [
  TutorialIntroStep,
  TutorialSwipeLeftStep,
  TutorialSwipeRightStep,
  TutorialHintStep,
  TutorialSRSStep,
];

// Titles for full tutorial - null means no title (contextual screens already self-explanatory)
const FULL_TUTORIAL_TITLES: (string | null)[] = [
  STRINGS.TUTORIAL_INTRO_TITLE,
  null,
  null,
  null,
  STRINGS.TUTORIAL_SRS_TITLE,
];

// Contextual help (single step, no title)
const CONTEXTUAL_COMPONENTS: Record<ContextualHelpType, React.ComponentType> = {
  [ContextualHelpType.SWIPE_LEFT]: TutorialSwipeLeftStep,
  [ContextualHelpType.SWIPE_RIGHT]: TutorialSwipeRightStep,
  [ContextualHelpType.HINT]: TutorialHintStep,
};

export function SwipeGestureTutorial({
  visible,
  onDismiss,
  contextualHelp,
}: SwipeGestureTutorialProps) {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState<SwipeTutorialStep>(SwipeTutorialStep.INTRO);

  // Determine if this is the last step in full tutorial mode
  const isLastStep = currentStep === SwipeTutorialStep.SRS_EXPLAIN;

  // All hooks must be called unconditionally
  const handleContextualDismiss = useCallback(() => {
    lightFeedback();
    onDismiss();
  }, [onDismiss]);

  const handleFullTutorialNext = useCallback(() => {
    if (isLastStep) {
      successFeedback();
      setCurrentStep(SwipeTutorialStep.INTRO);
      onDismiss();
    } else {
      lightFeedback();
      setCurrentStep(prev => (prev + 1) as SwipeTutorialStep);
    }
  }, [isLastStep, onDismiss]);

  React.useEffect(() => {
    if (visible && !contextualHelp) {
      setCurrentStep(SwipeTutorialStep.INTRO);
    }
  }, [visible, contextualHelp]);

  // Contextual help mode - single step (no title)
  if (contextualHelp) {
    const StepContent = CONTEXTUAL_COMPONENTS[contextualHelp];

    return (
      <TutorialOverlay visible={visible} onDismiss={onDismiss}>
        <TutorialCard dismissText={STRINGS.TUTORIAL_NEXT} onDismiss={handleContextualDismiss}>
          <View style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <StepContent />
            </View>
          </View>
        </TutorialCard>
      </TutorialOverlay>
    );
  }

  // Full tutorial mode - multi-step
  const StepContent = FULL_TUTORIAL_COMPONENTS[currentStep] ?? TutorialIntroStep;
  const stepTitle = FULL_TUTORIAL_TITLES[currentStep];
  const dismissText = isLastStep ? STRINGS.TUTORIAL_SRS_CTA : STRINGS.TUTORIAL_NEXT;

  return (
    <TutorialOverlay visible={visible} onDismiss={onDismiss}>
      <TutorialCard dismissText={dismissText} onDismiss={handleFullTutorialNext}>
        <View style={styles.stepContainer}>
          {stepTitle && (
            <ThemedText type="heading3" style={[styles.title, { color: colors.text }]}>
              {stepTitle}
            </ThemedText>
          )}
          <View style={styles.stepContent}>
            <StepContent />
          </View>
        </View>
      </TutorialCard>
    </TutorialOverlay>
  );
}

SwipeGestureTutorial.displayName = 'SwipeGestureTutorial';

const styles = StyleSheet.create({
  stepContainer: {
    height: TUTORIAL_STEP_HEIGHT,
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  stepContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
