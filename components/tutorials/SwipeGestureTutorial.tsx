/**
 * Swipe gesture tutorial - visual-first, minimal text
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { SwipeTutorialStep, TUTORIAL_STEP_HEIGHT } from '@/constants/tutorials';

import { TutorialCoreFlowStep, TutorialUnsureStep } from './steps';
import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';

interface SwipeGestureTutorialProps {
  visible: boolean;
  onDismiss: () => void;
}

const STEP_COMPONENTS = [TutorialCoreFlowStep, TutorialUnsureStep];

export function SwipeGestureTutorial({ visible, onDismiss }: SwipeGestureTutorialProps) {
  const [currentStep, setCurrentStep] = useState<SwipeTutorialStep>(SwipeTutorialStep.CORE_FLOW);

  const isLastStep = currentStep === SwipeTutorialStep.UNSURE_FLOW;
  const StepContent = STEP_COMPONENTS[currentStep]!;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setCurrentStep(SwipeTutorialStep.CORE_FLOW);
      onDismiss();
    } else {
      setCurrentStep(SwipeTutorialStep.UNSURE_FLOW);
    }
  }, [isLastStep, onDismiss]);

  React.useEffect(() => {
    if (visible) {
      setCurrentStep(SwipeTutorialStep.CORE_FLOW);
    }
  }, [visible]);

  return (
    <TutorialOverlay visible={visible} onDismiss={onDismiss}>
      <TutorialCard
        dismissText={isLastStep ? STRINGS.TUTORIAL_START_PRACTICING : STRINGS.TUTORIAL_NEXT}
        onDismiss={handleNext}
      >
        <View style={styles.stepContent}>
          <StepContent />
        </View>
      </TutorialCard>
    </TutorialOverlay>
  );
}

SwipeGestureTutorial.displayName = 'SwipeGestureTutorial';

const styles = StyleSheet.create({
  stepContent: {
    height: TUTORIAL_STEP_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
