/**
 * Privacy
 * The one place a consent decision meets the SDKs.
 *
 * The dependencies run one way, so nothing here can close a cycle: this file
 * imports the SDK services and they import services/consent, which imports
 * neither.
 *
 * Like the services it drives, this never throws: a privacy choice must not be
 * able to take the app down, whichever way it goes.
 */
import { analytics } from '@/services/analytics';
import {
  isAllowed,
  loadConsent,
  mayHaveEarlierMeasurementGrant,
  saveConsent,
  type ConsentChoices,
} from '@/services/consent';
import { startInstallAttribution } from '@/services/installAttribution';
import { metaEvents } from '@/services/metaEvents';

/**
 * Bring the SDKs in line with the choice in force. Attribution comes last because
 * its events need Mixpanel up, and opted back in, first.
 *
 * `metaEvents.stop` runs only where Meta can have been switched on: a refusal on
 * a device that never allowed it makes no Meta call at all.
 */
const applyCurrentChoice = async (hadMeasurement: boolean): Promise<void> => {
  if (isAllowed('measurement')) {
    metaEvents.start();
  } else if (hadMeasurement) {
    metaEvents.stop();
  }

  if (isAllowed('analytics')) {
    await analytics.startTracking();
  } else {
    await analytics.stopTracking();
  }

  await startInstallAttribution();
};

/** At launch: load the stored choice and start whatever it allows. */
export const restoreConsentChoices = async (): Promise<void> => {
  try {
    await loadConsent();
    await applyCurrentChoice(mayHaveEarlierMeasurementGrant());
  } catch {
    // Non-critical: with nothing started, nothing is sent.
  }
};

/** A decision, from the consent step or Privacy choices: save it, then act on it. */
export const applyConsentChoices = async (choices: ConsentChoices): Promise<void> => {
  try {
    const previous = await loadConsent();
    const hadMeasurement = previous?.measurement === true || mayHaveEarlierMeasurementGrant();

    await saveConsent(choices);
    await applyCurrentChoice(hadMeasurement);
  } catch {
    // Non-critical: the gates read the saved choice whether or not this finished.
  }
};
