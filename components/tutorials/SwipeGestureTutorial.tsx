/**
 * Review tutorial — three steps shown once before the first practice session:
 * how it works → the three grades → ready.
 *
 * Renders through the same TutorialStepLayout as WelcomeIntro so the two
 * first-run walkthroughs look like one product. The previous version was four
 * steps built from separate swipe-left / swipe-right screens that taught a
 * binary model for a ternary grade bar.
 */

import type { IoniconName } from '@/components/ui';
import { useCallback, useState, type ComponentType } from 'react';

import { STRINGS } from '@/constants/strings';
import { ReviewTutorialStep } from '@/constants/tutorials';
import { lightFeedback } from '@/utils/haptics';

import { TutorialGradesStep } from './steps';
import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialStepLayout } from './TutorialStepLayout';

interface SwipeGestureTutorialProps {
  visible: boolean;
  onDismiss: () => void;
}

interface ReviewTutorialStepConfig {
  icon: IoniconName;
  title: string;
  body: string;
  /** Optional extra visual rendered under the body */
  content?: ComponentType;
}

const STEPS: ReviewTutorialStepConfig[] = [
  {
    icon: 'layers-outline',
    title: STRINGS.TUTORIAL_INTRO_TITLE,
    body: STRINGS.TUTORIAL_INTRO_DESCRIPTION,
  },
  {
    icon: 'options-outline',
    title: STRINGS.TUTORIAL_GRADES_TITLE,
    body: STRINGS.TUTORIAL_GRADES_BODY,
    content: TutorialGradesStep,
  },
  {
    icon: 'sparkles-outline',
    title: STRINGS.TUTORIAL_SRS_TITLE,
    body: STRINGS.TUTORIAL_SRS_DESCRIPTION,
  },
];

const LAST_STEP = STEPS.length - 1;

export function SwipeGestureTutorial({ visible, onDismiss }: SwipeGestureTutorialProps) {
  const [currentStep, setCurrentStep] = useState<number>(ReviewTutorialStep.INTRO);

  const isLastStep = currentStep === LAST_STEP;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      lightFeedback();
      setCurrentStep(ReviewTutorialStep.INTRO);
      onDismiss();
    } else {
      // Clamp at the last step: when the JS thread is busy (session preparing),
      // several taps can batch into one render with a stale isLastStep, and an
      // unbounded prev + 1 would walk past the array into a stuck fallback
      // state that can never dismiss.
      setCurrentStep(prev => (prev >= LAST_STEP ? LAST_STEP : prev + 1));
    }
  }, [isLastStep, onDismiss]);

  // Reset to first step when the tutorial transitions from hidden→visible.
  // Uses the "store previous prop in state" pattern instead of an effect.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setCurrentStep(ReviewTutorialStep.INTRO);
    }
  }

  const step = STEPS[currentStep] ?? STEPS[ReviewTutorialStep.INTRO];
  if (!step) return null;

  const StepContent = step.content;

  return (
    <TutorialOverlay visible={visible} onDismiss={onDismiss}>
      <TutorialCard
        dismissText={isLastStep ? STRINGS.TUTORIAL_SRS_CTA : STRINGS.TUTORIAL_NEXT}
        onDismiss={handleNext}
        // On the last step the CTA is the way out, so a Skip beside it is noise.
        onSkip={isLastStep ? undefined : onDismiss}
      >
        <TutorialStepLayout
          icon={step.icon}
          title={step.title}
          body={step.body}
          stepCount={STEPS.length}
          currentStep={currentStep}
        >
          {StepContent && <StepContent />}
        </TutorialStepLayout>
      </TutorialCard>
    </TutorialOverlay>
  );
}

SwipeGestureTutorial.displayName = 'SwipeGestureTutorial';
