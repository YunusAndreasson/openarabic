/**
 * Install Attribution
 * Lets an ad be followed into the app, joined through a random ID instead of who
 * someone is.
 *
 * THE NAMES ARE A CONTRACT
 * ========================
 * An external system reads `install_id`, `First Open`, `Install Attribution`,
 * `Activated` and `referrer_0`, `referrer_1`, ... from Mixpanel. Renaming any of
 * them breaks that system without an error on either side.
 *
 * All of this goes to Mixpanel only. `install_id` must never reach Meta: being
 * the one join, it would hand Meta a link to everything Mixpanel knows. It is
 * made and registered by services/analytics, when Mixpanel first starts, so it is
 * on every event, these included.
 *
 * ONCE PER INSTALL
 * ================
 * services/analyticsInstall decides once whether this is a new install or an
 * existing user upgrading, before any consent, and keeps a flag per event. An
 * existing user has `Install Attribution` and `Activated` marked done without
 * either being sent. That includes `Activated`, which is defined as the first
 * completed session: theirs was long ago. `First Open` goes out for both, with
 * `install_kind` saying which.
 *
 * A flag is written before its event is sent, so a crash between the two loses
 * one event and never sends one twice. A choice that is missing when an event
 * would fire leaves the flag unset, so it fires once the choice is made.
 *
 * SILENT-FAILURE DESIGN PATTERN
 * =============================
 * Mirrors services/analytics.ts: nothing here throws or logs. A failed step is
 * tried again by the next launch.
 */
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { claimOnce, loadInstallRecord } from '@/services/analyticsInstall';
import { isAllowed, loadConsent } from '@/services/consent';
import { withTimeout } from '@/utils/async';

/** Mixpanel cuts a string property at 255 bytes; the contract is 200 characters a part. */
const REFERRER_PART_LENGTH = 200;
const REFERRER_PROPERTY_PREFIX = 'referrer_';

/** The read goes to the Play Store. It holds up the queue, `Activated` included, while it runs. */
const REFERRER_READ_TIMEOUT_MS = 10 * 1000;

/**
 * One step at a time. A launch's restore, a consent decision and the first open
 * can overlap, and two steps reading the same flags before either wrote would
 * both send.
 */
let queue: Promise<void> = Promise.resolve();

const runExclusive = (task: () => Promise<void>): Promise<void> => {
  queue = queue.then(task).catch(() => {
    // Non-critical, and the next step must still run.
  });
  return queue;
};

/** Without analytics consent nothing here is sent, and nothing is marked sent. */
const isAnalyticsAllowed = async (): Promise<boolean> => {
  await loadConsent();
  return isAllowed('analytics');
};

/** `referrer_0`, `referrer_1`, ... The raw string, neither decoded nor parsed. */
const splitReferrer = (referrer: string): Record<string, string> => {
  const parts: Record<string, string> = {};
  for (let start = 0; start < referrer.length; start += REFERRER_PART_LENGTH) {
    const index = start / REFERRER_PART_LENGTH;
    parts[`${REFERRER_PROPERTY_PREFIX}${index}`] = referrer.slice(
      start,
      start + REFERRER_PART_LENGTH,
    );
  }
  return parts;
};

/** Android only, and it needs both choices: the referrer says which ad it was. */
const sendInstallAttribution = async (): Promise<void> => {
  if (Platform.OS !== 'android' || !isAllowed('measurement')) return;

  const record = await loadInstallRecord();
  if (!record || record.installAttributionSent) return;

  // A rejection or a timeout leaves the flag unset, for the next launch to try again.
  const referrer = await withTimeout(
    Application.getInstallReferrerAsync(),
    REFERRER_READ_TIMEOUT_MS,
    () => {
      throw new Error('The install referrer did not answer');
    },
  );

  // An empty referrer is an answer: there is nothing to attribute, now or later.
  // expo-application stringifies a null one, so that arrives as the word itself.
  const hasReferrer = referrer !== '' && referrer !== 'null';

  if ((await claimOnce('installAttributionSent')) && hasReferrer) {
    await analytics.track(ANALYTICS_EVENTS.INSTALL_ATTRIBUTION, splitReferrer(referrer));
  }
};

/**
 * `First Open`, the one time it is due and analytics may see it. Called for the
 * first App Opened of a launch the learner sees (hooks/app/useAppOpenTracking)
 * and after a consent decision, so an install that asked first still gets one,
 * on the open where it was allowed.
 */
export const trackFirstOpen = (): Promise<void> =>
  runExclusive(async () => {
    if (!(await isAnalyticsAllowed())) return;

    const record = await claimOnce('firstOpenSent');
    if (record) {
      await analytics.track(ANALYTICS_EVENTS.FIRST_OPEN, { install_kind: record.installKind });
    }
  });

/**
 * At launch and after every consent decision. Decides new or upgrade whatever the
 * choice is (that only touches the device, and has to happen on the first launch
 * however long the decision takes), and sends only what the choice allows. The
 * Mixpanel side must already be started: see `applyCurrentChoice` in
 * services/privacy.
 */
export const startInstallAttribution = (): Promise<void> =>
  runExclusive(async () => {
    await loadInstallRecord();
    if (!(await isAnalyticsAllowed())) return;
    await sendInstallAttribution();
  });

/**
 * A practice session finished. `Activated` goes out once, on the first one that
 * has consent behind it: without consent the event is dropped and left unmarked,
 * and the flag is the only thing that remembers. Someone who practised before
 * allowing analytics did activate, so their later session still counts.
 */
export const trackActivated = (): Promise<void> =>
  runExclusive(async () => {
    if (!(await isAnalyticsAllowed())) return;

    if (await claimOnce('activatedSent')) {
      await analytics.track(ANALYTICS_EVENTS.ACTIVATED);
    }
  });
