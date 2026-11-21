import { useConsent } from '@/hooks/privacy/useConsent';
import type { ConsentChoices, ConsentPurpose } from '@/services/consent';
import { applyConsentChoices } from '@/services/privacy';

/**
 * The Privacy choices screen: the stored choice, where each change applies at
 * once. Having no choice yet reads as both off, the same as the consent step.
 */
export const usePrivacyChoices = () => {
  const { consent } = useConsent();
  const choices: ConsentChoices = {
    analytics: consent?.analytics ?? false,
    measurement: consent?.measurement ?? false,
  };

  return {
    choices,
    setChoice: (purpose: ConsentPurpose, value: boolean) =>
      void applyConsentChoices({ ...choices, [purpose]: value }),
  };
};
