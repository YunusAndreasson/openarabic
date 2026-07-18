/**
 * Welcome intro — three-step first-run walkthrough of the hallmark features
 * (read bilingual texts → tap any word → listen to bilingual audio).
 * Shown once after first sign-in, gated by TutorialId.WELCOME_INTRO.
 */

import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_STEP_HEIGHT, TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { lightFeedback } from '@/utils/haptics';

import { TutorialCard } from './TutorialCard';
import { TutorialOverlay } from './TutorialOverlay';

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
    key: 'tap',
    icon: 'hand-left-outline',
    title: STRINGS.ONBOARDING_STEP_TAP_TITLE,
    body: STRINGS.ONBOARDING_STEP_TAP_BODY,
  },
  {
    key: 'listen',
    icon: 'headset-outline',
    title: STRINGS.ONBOARDING_STEP_LISTEN_TITLE,
    body: STRINGS.ONBOARDING_STEP_LISTEN_BODY,
  },
];

export function WelcomeIntro({ visible, onDismiss, onOpenFirstText }: WelcomeIntroProps) {
  const colors = useColors();
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

  // Backdrop tap = skip: still completes the tutorial (one-shot)
  const handleSkip = useCallback(() => {
    analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_SKIPPED, { step_index: currentStep });
    onDismiss();
  }, [currentStep, onDismiss]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      lightFeedback();
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_INTRO_COMPLETED, { cta: 'open_first_text' });
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
      >
        <View style={styles.stepContainer}>
          <ThemedText type="heading3" style={[styles.title, { color: colors.text }]}>
            {step.title}
          </ThemedText>

          <View style={styles.stepContent}>
            <View style={[styles.iconIndicator, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name={step.icon} size={TUTORIAL_VISUALS.ICON_SIZE} color={colors.tint} />
            </View>

            <View style={[styles.descriptionCard, { backgroundColor: colors.elevation1 }]}>
              <ThemedText type="body" variant="secondary" style={styles.description}>
                {step.body}
              </ThemedText>
            </View>
          </View>

          <View style={styles.dotsRow}>
            {INTRO_STEPS.map((dotStep, index) => (
              <View
                key={dotStep.key}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentStep ? colors.primary : colors.elevation2,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </TutorialCard>
    </TutorialOverlay>
  );
}

WelcomeIntro.displayName = 'WelcomeIntro';

const DOT_SIZE = 6;

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
  iconIndicator: {
    width: TUTORIAL_VISUALS.ICON_SIZE * 2,
    height: TUTORIAL_VISUALS.ICON_SIZE * 2,
    borderRadius: TUTORIAL_VISUALS.ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  descriptionCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  description: {
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
