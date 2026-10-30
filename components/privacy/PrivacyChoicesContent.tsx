import { ScreenScaffold } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ConsentChoiceRows } from '@/components/privacy/ConsentChoiceRows';
import { STRINGS } from '@/constants/strings';
import { usePrivacyChoices } from '@/hooks/privacy/usePrivacyChoices';

/**
 * The consent step's toggles, with the current values. Each change applies at once.
 *
 * Two routes show this, because Settings needs an account and withdrawing can't:
 * someone who allowed measurement on the first screen may never sign up.
 */
export const PrivacyChoicesContent = () => {
  const { choices, setChoice } = usePrivacyChoices();

  return (
    <ScreenScaffold>
      <ThemedText type="body">{STRINGS.CONSENT_INTRO}</ThemedText>
      <ConsentChoiceRows choices={choices} onChange={setChoice} />
    </ScreenScaffold>
  );
};
