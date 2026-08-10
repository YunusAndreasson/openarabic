/**
 * Welcome intro — three-step first-run walkthrough of the loop the app is built
 * on (read a text → save the words you meet → they come back for review).
 *
 * Deliberately NOT a repeat of the auth screen's Read/Tap/Listen value props:
 * the user has just read those. Spaced repetition is the thing nothing else in
 * the first run explains, so it gets the last slide.
 *
 * Shown once after first sign-in, gated by TutorialId.WELCOME_INTRO.
 */

import { type IoniconName } from '@/components/ui/Icon';
import { useCallback, useEffect, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
import { lightFeedback } from '@/utils/haptics';

import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialStepLayout } from './TutorialStepLayout';

interface WelcomeIntroProps {
  visible: boolean;
  /** Completes the tutorial (marks seen) */
  onDismiss: () => void;
  /** Final CTA — navigate to the starter article */
  onOpenFirstText: () => void;
}

interface IntroStep {
  key: string;
  icon: IoniconName;
  title: string;
  body: string;
}

const INTRO_STEPS: IntroStep[] = [
  {
    key: 'read',
    icon: 'book-outline',
    title: STRINGS.ONBOARDING_STEP_READ_TITLE,
    body: STRINGS.ONBOARDING_STEP_READ_BODY,
  },
  {
    key: 'save',
    icon: 'bookmark-outline',
    title: STRINGS.ONBOARDING_STEP_SAVE_TITLE,
    body: STRINGS.ONBOARDING_STEP_SAVE_BODY,
  },
  {
    key: 'review',
    icon: 'sparkles-outline',
    title: STRINGS.ONBOARDING_STEP_REVIEW_TITLE,
    body: STRINGS.ONBOARDING_STEP_REVIEW_BODY,
  },
];

export function WelcomeIntro({ visible, onDismiss, onOpenFirstText }: WelcomeIntroProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === INTRO_STEPS.length - 1;
  const step = INTRO_STEPS[currentStep] ?? INTRO_STEPS[0];

  // Reset to first step on hidden→visible (store-previous-prop pattern)
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setCurrentStep(0);
    }
  }

  useEffect(() => {
    if (visible) {
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_VIEWED);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && step) {
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_STEP_VIEWED, {
        step_index: currentStep,
        step_name: step.key,
      });
    }
  }, [visible, currentStep, step]);

  // Skip (visible affordance or backdrop tap) still completes the tutorial (one-shot)
  const handleSkip = useCallback(() => {
    analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_SKIPPED, { step_index: currentStep });
    onDismiss();
  }, [currentStep, onDismiss]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      lightFeedback();
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_COMPLETED, { cta: 'open_first_text' });
      metaEvents.logTutorialComplete();
      onDismiss();
      onOpenFirstText();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onDismiss, onOpenFirstText]);

  if (!step) return null;

  return (
    <TutorialOverlay visible={visible} onDismiss={handleSkip}>
      <TutorialCard
        dismissText={isLastStep ? STRINGS.ONBOARDING_CTA : STRINGS.ONBOARDING_NEXT}
        onDismiss={handleNext}
        // On the last step the CTA is the way out, so a Skip beside it is noise.
        onSkip={isLastStep ? undefined : handleSkip}
      >
        <TutorialStepLayout
          icon={step.icon}
          title={step.title}
          body={step.body}
          stepCount={INTRO_STEPS.length}
          currentStep={currentStep}
        />
      </TutorialCard>
    </TutorialOverlay>
  );
}

WelcomeIntro.displayName = 'WelcomeIntro';
