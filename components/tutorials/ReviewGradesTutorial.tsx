/**
 * Review tutorial — three steps shown once before the first practice session:
 * how it works → the three grades → ready.
 *
 * Renders through the same TutorialStepLayout as WelcomeIntro so the two
 * first-run walkthroughs look like one product. Two versions ago this was four
 * steps built from separate swipe-left / swipe-right screens, teaching a binary
 * model for a ternary grade bar; the swipe itself has since been removed, and
 * the name followed the content here rather than the other way round.
 */

import type { IconName } from '@/components/ui';
import { useCallback, type ComponentType } from 'react';

import { STRINGS } from '@/constants/strings';
import { ReviewTutorialStep } from '@/constants/tutorials';
import { useTutorialSteps } from '@/hooks/tutorials/useTutorialSteps';

import { TutorialGradesStep } from './steps';
import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialStepLayout } from './TutorialStepLayout';

interface ReviewGradesTutorialProps {
  visible: boolean;
  onDismiss: () => void;
}

interface ReviewTutorialStepConfig {
  icon: IconName;
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

export function ReviewGradesTutorial({ visible, onDismiss }: ReviewGradesTutorialProps) {
  // `next` clamps at the last step; see useTutorialSteps for why it must.
  const {
    step: currentStep,
    isLast: isLastStep,
    next,
    reset,
  } = useTutorialSteps(STEPS.length, visible);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      reset();
      onDismiss();
    } else {
      next();
    }
  }, [isLastStep, next, reset, onDismiss]);

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

ReviewGradesTutorial.displayName = 'ReviewGradesTutorial';
