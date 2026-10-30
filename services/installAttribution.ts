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
 * the one join, it would hand Meta a link to everything Mixpanel knows.
 *
 * ONCE PER INSTALL, AND ONLY FOR A NEW INSTALL
 * ============================================
 * The first time this code runs it decides whether this is a new install, from
 * how long ago the app was installed. That step reads and writes only this
 * device, so it runs before any consent: otherwise someone who refused and changed
 * their mind three days later would read as an upgrade, and their install would be
 * lost to the funnel. An existing user upgrading has all three events marked
 * done without any being sent. That includes `Activated`, which is defined as the
 * first completed session: theirs was long ago.
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
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { analytics } from '@/services/analytics';
import { isAllowed, loadConsent } from '@/services/consent';
import { withTimeout } from '@/utils/async';
import { createJsonStore, decodeFields } from '@/utils/createJsonStore';
import { MILLISECONDS_PER_DAY } from '@/utils/dateTimeUtils';

/** Older than this, the first run reads as an existing user upgrading. */
const NEW_INSTALL_WINDOW_MS = MILLISECONDS_PER_DAY;

/** Mixpanel cuts a string property at 255 bytes; the contract is 200 characters a part. */
const REFERRER_PART_LENGTH = 200;
const REFERRER_PROPERTY_PREFIX = 'referrer_';

/** The read goes to the Play Store. It holds up the queue, `Activated` included, while it runs. */
const REFERRER_READ_TIMEOUT_MS = 10 * 1000;

interface AttributionState {
  /** Whether this install has been judged new or upgraded. */
  classified: boolean;
  /** Empty until analytics is first allowed: nothing needs it before then. */
  installId: string;
  firstOpenDone: boolean;
  installAttributionDone: boolean;
  activatedDone: boolean;
}

type DoneFlag = 'firstOpenDone' | 'installAttributionDone' | 'activatedDone';

const EMPTY_STATE: AttributionState = {
  classified: false,
  installId: '',
  firstOpenDone: false,
  installAttributionDone: false,
  activatedDone: false,
};

// A failed read is null, not the empty state: treating it as a new install could
// send `First Open` twice and replace the ID that joins everything.
const store = createJsonStore<AttributionState | null>({
  key: STORAGE_KEYS.INSTALL_ATTRIBUTION,
  decode: raw =>
    decodeFields(raw, EMPTY_STATE, {
      classified: 'boolean',
      installId: 'string',
      firstOpenDone: 'boolean',
      installAttributionDone: 'boolean',
      activatedDone: 'boolean',
    }),
  empty: () => EMPTY_STATE,
  onReadError: () => null,
  report: false,
  cache: true,
});

/**
 * One step at a time. A launch's restore and a consent decision can overlap, and
 * two steps reading the same flags before either wrote would both send.
 */
let queue: Promise<void> = Promise.resolve();

const runExclusive = (task: () => Promise<void>): Promise<void> => {
  queue = queue.then(task).catch(() => {
    // Non-critical, and the next step must still run.
  });
  return queue;
};

const update = async (
  state: AttributionState,
  changes: Partial<AttributionState>,
): Promise<AttributionState> => {
  const next = { ...state, ...changes };
  await store.write(next);
  return next;
};

/** Throws when the install time can't be read, leaving it for the next launch. */
const classifyInstall = async (state: AttributionState): Promise<AttributionState> => {
  if (state.classified) return state;

  const installedAt = await Application.getInstallationTimeAsync();
  const isUpgrade = Date.now() - installedAt.getTime() > NEW_INSTALL_WINDOW_MS;

  return update(state, {
    classified: true,
    ...(isUpgrade && { firstOpenDone: true, installAttributionDone: true, activatedDone: true }),
  });
};

/** Made once and kept, then registered so every event carries it. */
const ensureInstallId = async (state: AttributionState): Promise<AttributionState> => {
  const next = state.installId ? state : await update(state, { installId: Crypto.randomUUID() });

  await analytics.registerInstallId(next.installId);
  return next;
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

const sendOnce = async (
  state: AttributionState,
  flag: DoneFlag,
  send: () => Promise<void>,
): Promise<AttributionState> => {
  const next = await update(state, { [flag]: true });
  await send();
  return next;
};

/** Android only, and it needs both choices: the referrer says which ad it was. */
const sendInstallAttribution = async (state: AttributionState): Promise<AttributionState> => {
  if (Platform.OS !== 'android' || state.installAttributionDone || !isAllowed('measurement')) {
    return state;
  }

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

  return sendOnce(state, 'installAttributionDone', async () => {
    if (hasReferrer) {
      await analytics.track(ANALYTICS_EVENTS.INSTALL_ATTRIBUTION, splitReferrer(referrer));
    }
  });
};

/**
 * At launch and after every consent decision. Decides new or upgrade whatever the
 * choice is, and sends only what the choice allows. The Mixpanel side must already
 * be started: see `applyCurrentChoice` in services/privacy.
 */
export const startInstallAttribution = (): Promise<void> =>
  runExclusive(async () => {
    await loadConsent();
    const stored = await store.read();
    if (!stored) return;

    const classified = await classifyInstall(stored);
    if (!isAllowed('analytics')) return;

    let state = await ensureInstallId(classified);
    if (!state.firstOpenDone) {
      state = await sendOnce(state, 'firstOpenDone', () =>
        analytics.track(ANALYTICS_EVENTS.FIRST_OPEN),
      );
    }
    await sendInstallAttribution(state);
  });

/**
 * A practice session finished. `Activated` goes out once, on the first one that
 * has consent behind it: without consent the event is dropped and left unmarked,
 * and the flag is the only thing that remembers. Someone who practised before
 * allowing analytics did activate, so their later session still counts.
 */
export const trackActivated = (): Promise<void> =>
  runExclusive(async () => {
    await loadConsent();
    if (!isAllowed('analytics')) return;

    const stored = await store.read();
    if (!stored) return;

    const state = await ensureInstallId(await classifyInstall(stored));
    if (state.activatedDone) return;

    await sendOnce(state, 'activatedDone', () => analytics.track(ANALYTICS_EVENTS.ACTIVATED));
  });
