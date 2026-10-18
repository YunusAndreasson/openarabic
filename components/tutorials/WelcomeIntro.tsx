/**
 * Welcome intro — four-step first-run walkthrough of the loop the app is built
 * on (read a text → save the words you meet → they come back for review), and
 * then the best way to run that loop (say the answer instead of tapping).
 *
 * Deliberately NOT a repeat of the auth screen's Read/Tap/Listen value props:
 * the user has just read those. Spaced repetition is the thing nothing else in
 * the first run explains, so it keeps its slide; speaking follows it because it
 * is about HOW you review, which only makes sense once review does.
 *
 * The speak slide is awareness only. It never asks, never downloads and never
 * flips `voiceEnabled` — the offer itself lives on the completion screen (and
 * the toggle in Account → Practice), where a yes costs a 103 MB download the
 * learner has to agree to. It used to have a second home, a dormant mic in the
 * review header; that whole header slot is gone, which makes this slide the
 * earliest a learner hears of the feature at all.
 *
 * The final CTA stays "Open your first text" regardless of which slide is
 * last: the intro always ends by sending you off to read.
 *
 * Shown once after first sign-in, gated by TutorialId.WELCOME_INTRO.
 */

import type { IconName } from '@/components/ui';
import { useCallback, useEffect, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';

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
  icon: IconName;
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
  {
    key: 'speak',
    icon: 'mic-outline',
    title: STRINGS.ONBOARDING_STEP_SPEAK_TITLE,
    body: STRINGS.ONBOARDING_STEP_SPEAK_BODY,
  },
];

export function WelcomeIntro({ visible, onDismiss, onOpenFirstText }: WelcomeIntroProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === INTRO_STEPS.length - 1;
  const step = INTRO_STEPS[currentStep] ?? INTRO_STEPS[0];

  // Guards the last-step completion below: `onDismiss()` flips the `visible`
  // prop through the parent, which only lands on a LATER render — a double
  // tap on the final CTA before that commit fires the completion block twice,
  // pushing the starter article route onto the stack a second time. State,
  // not a ref: a ref write here would run during render (same block as the
  // `currentStep` reset below), which React Compiler rejects.
  const [completed, setCompleted] = useState(false);

  // Reset to first step on hidden→visible (store-previous-prop pattern)
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setCurrentStep(0);
      setCompleted(false);
    }
  }

  useEffect(() => {
    if (visible) {
      void analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_VIEWED);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && step) {
      void analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_STEP_VIEWED, {
        step_index: currentStep,
        step_name: step.key,
      });
    }
  }, [visible, currentStep, step]);

  // Skip (visible affordance or backdrop tap) still completes the tutorial (one-shot)
  const handleSkip = useCallback(() => {
    void analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_SKIPPED, { step_index: currentStep });
    onDismiss();
  }, [currentStep, onDismiss]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      if (completed) return;
      setCompleted(true);
      void analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_COMPLETED, { cta: 'open_first_text' });
      metaEvents.logTutorialComplete();
      onDismiss();
      onOpenFirstText();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, completed, onDismiss, onOpenFirstText]);

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
