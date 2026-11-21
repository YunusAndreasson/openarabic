import { useState } from 'react';

import type { ConsentChoices, ConsentPurpose } from '@/services/consent';
import { applyConsentChoices } from '@/services/privacy';

const ALLOW_BOTH: ConsentChoices = { analytics: true, measurement: true };
const REFUSE_BOTH: ConsentChoices = { analytics: false, measurement: false };

/**
 * The first-launch consent step: toggles that start off, and three ways out.
 *
 * "Allow both" and "Refuse both" decide outright, whatever the toggles show, so
 * refusing takes exactly one tap. Only "Save my choices" reads them.
 */
export const useConsentPrompt = () => {
  const [choices, setChoices] = useState<ConsentChoices>(REFUSE_BOTH);

  return {
    choices,
    setChoice: (purpose: ConsentPurpose, value: boolean) =>
      setChoices(current => ({ ...current, [purpose]: value })),
    allowBoth: () => void applyConsentChoices(ALLOW_BOTH),
    refuseBoth: () => void applyConsentChoices(REFUSE_BOTH),
    saveChoices: () => void applyConsentChoices(choices),
  };
};
