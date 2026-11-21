/**
 * Install Attribution
 * Lets an ad or a link be followed into the app, joined through a random ID
 * instead of who someone is.
 *
 * THE NAMES ARE A CONTRACT
 * ========================
 * An external system reads `install_id`, `First Open` with `install_kind`,
 * `Install Attribution` with `referrer_0`, `referrer_1`, ... and `Activated` from
 * Mixpanel. Renaming any of them breaks that system without an error on either
 * side.
 *
 * All of this goes to Mixpanel only. `install_id` must never reach Meta, Sentry
 * or our backend: being the one join, it would hand them a link to everything
 * Mixpanel knows. services/analytics makes and registers it as Mixpanel starts,
 * so it is on every event, these included.
 *
 * ONCE PER INSTALL
 * ================
 * services/analyticsInstall decides once whether this is a new install or an
 * existing user upgrading, and keeps a flag per event. An existing user has
 * `Install Attribution` and `Activated` marked done without either being sent;
 * `First Open` goes out for both, with `install_kind` saying which.
 *
 * A flag is written before its event is sent, so a crash between the two loses
 * one event and never sends one twice.
 *
 * SILENT-FAILURE DESIGN PATTERN
 * =============================
 * Mirrors services/analytics.ts: nothing here throws or logs.
 */
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { claimOnce, countReferrerRead, loadInstallRecord } from '@/services/analyticsInstall';
import { withTimeout } from '@/utils/async';

/** Mixpanel cuts a string property at 255 bytes; the contract is 200 characters a part. */
const REFERRER_PART_LENGTH = 200;
const REFERRER_PROPERTY_PREFIX = 'referrer_';

/** The read goes to the Play Store, which may not answer. */
const REFERRER_READ_TIMEOUT_MS = 10 * 1000;

/**
 * Launches that may ask for the referrer. A read that fails, times out or comes
 * back empty is asked again on a later launch, up to this many in all; after the
 * last there is nothing to attribute.
 */
const MAX_REFERRER_READS = 3;

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

/** The referrer, or '' when the Play Store failed, did not answer or had none. */
const readReferrer = async (): Promise<string> => {
  try {
    const referrer = await withTimeout(
      Application.getInstallReferrerAsync(),
      REFERRER_READ_TIMEOUT_MS,
      () => '',
    );
    // expo-application stringifies a null referrer, so that arrives as the word itself.
    return referrer === 'null' ? '' : referrer;
  } catch {
    return '';
  }
};

const sendInstallAttribution = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  const record = await loadInstallRecord();
  if (!record || record.installAttributionSent) return;

  const reads = await countReferrerRead();
  if (reads === null) return;
  // A read cut short by a crash or an app kill was counted, and still uses one up.
  if (reads > MAX_REFERRER_READS) {
    await claimOnce('installAttributionSent');
    return;
  }

  const referrer = await readReferrer();
  if (!referrer) {
    // Left unmarked for a later launch, until this was the last read.
    if (reads >= MAX_REFERRER_READS) await claimOnce('installAttributionSent');
    return;
  }

  if (await claimOnce('installAttributionSent')) {
    await analytics.track(ANALYTICS_EVENTS.INSTALL_ATTRIBUTION, splitReferrer(referrer));
  }
};

/** One read per launch, however many callers: two would each count a read. */
let attribution: Promise<void> | null = null;

/**
 * `Install Attribution`, once per new Android install. Called after the first
 * App Opened of each launch (hooks/app/useAppOpenTracking), so it follows
 * `First Open`; a launch that found nothing leaves it for the next.
 */
export const startInstallAttribution = (): Promise<void> => {
  attribution ??= sendInstallAttribution().catch(() => {
    // Non-critical: a later launch tries again.
  });
  return attribution;
};

/** `First Open`, the one time it is due: the first App Opened of this install. */
export const trackFirstOpen = async (): Promise<void> => {
  const record = await claimOnce('firstOpenSent');
  if (record) {
    await analytics.track(ANALYTICS_EVENTS.FIRST_OPEN, { install_kind: record.installKind });
  }
};

/**
 * A practice session finished (hooks/review/useReviewCompletion). `Activated`
 * goes out on the first one of a new install, and never for an existing install:
 * theirs was long ago.
 */
export const trackActivated = async (): Promise<void> => {
  if (await claimOnce('activatedSent')) {
    await analytics.track(ANALYTICS_EVENTS.ACTIVATED);
  }
};
