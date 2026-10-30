/**
 * Consent
 * What the person agreed to, on this device.
 *
 * Two independent choices, one per third party: `analytics` (Mixpanel) and
 * `measurement` (Meta). Nothing reaches either before the matching choice, on any
 * platform, including on upgrade from a version that never asked.
 *
 * DEFAULT IS DENY
 * ===============
 * Every way of not knowing reads as no consent: nothing stored, a read that
 * failed, a blob that does not parse, and a choice made under another
 * `CONSENT_VERSION`. `isAllowed` is false until a stored choice says otherwise,
 * including in the moment before the first read lands.
 *
 * This module holds the choice and nothing else. Switching the SDKs on and off is
 * services/privacy, because the SDK services read from here.
 */
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { createExternalStore } from '@/utils/createExternalStore';
import { createJsonStore } from '@/utils/createJsonStore';

/**
 * The version of what people agreed to. A stored choice with another version
 * counts as no decision, so bumping this (with the wording) asks everyone again.
 */
export const CONSENT_VERSION = 1;

export type ConsentPurpose = 'analytics' | 'measurement';

export type ConsentChoices = Readonly<Record<ConsentPurpose, boolean>>;

export interface StoredConsent extends ConsentChoices {
  readonly version: number;
  /** ISO 8601. */
  readonly decidedAt: string;
}

export interface ConsentState {
  /** The stored choice has been read. Until then `consent` is null for a different reason. */
  readonly isLoaded: boolean;
  /** The choice in force; null when none has been made. */
  readonly consent: StoredConsent | null;
}

/** Something is stored but cannot be read as a choice. It may once have allowed anything. */
const UNREADABLE = 'unreadable';

type StoredRead = StoredConsent | typeof UNREADABLE | null;

const decodeConsent = (raw: unknown): StoredRead => {
  if (typeof raw !== 'object' || raw === null) return UNREADABLE;
  const { analytics, measurement, version, decidedAt } = raw as Partial<
    Record<keyof StoredConsent, unknown>
  >;
  return typeof analytics === 'boolean' &&
    typeof measurement === 'boolean' &&
    typeof version === 'number' &&
    typeof decidedAt === 'string'
    ? { analytics, measurement, version, decidedAt }
    : UNREADABLE;
};

// Silent (`report: false`): analytics reads through here, so reporting a failed
// read through analytics would be asking the thing that failed.
const store = createJsonStore<StoredRead>({
  key: STORAGE_KEYS.PRIVACY_CONSENT,
  decode: decodeConsent,
  empty: () => null,
  onReadError: () => UNREADABLE,
  report: false,
});

const state = createExternalStore<ConsentState>({ isLoaded: false, consent: null });

let earlierMeasurementPossible = false;
let loading: Promise<StoredConsent | null> | null = null;

const readStoredConsent = async (): Promise<StoredConsent | null> => {
  const stored = await store.read();
  const consent =
    stored !== null && stored !== UNREADABLE && stored.version === CONSENT_VERSION ? stored : null;

  earlierMeasurementPossible =
    stored === UNREADABLE || (stored !== null && consent === null && stored.measurement);
  state.set({ isLoaded: true, consent });
  return consent;
};

/**
 * The stored choice, read once per launch and memoised as a promise, so a call
 * that arrives before the read lands waits for it instead of reading "no". Never
 * rejects: a failed read resolves null.
 */
export const loadConsent = (): Promise<StoredConsent | null> => {
  loading ??= readStoredConsent();
  return loading;
};

/** The choice in force, synchronously; null until one has been loaded or made. */
export const getConsent = (): StoredConsent | null => state.get().consent;

/** The `useSyncExternalStore` snapshot: stable between changes. */
export const getConsentState = (): ConsentState => state.get();

/** Listen for the choice loading or changing; returns the unsubscribe. */
export const subscribeConsent = (listener: () => void): (() => void) => state.subscribe(listener);

export const isAllowed = (purpose: ConsentPurpose): boolean => getConsent()?.[purpose] === true;

/**
 * Whether this launch found a choice that no longer counts but may have switched
 * Meta on: an older version that allowed measurement, or a blob that could not be
 * read. The Meta SDK persists its own settings natively, and they outlive the
 * choice that set them, so services/privacy has to switch them off explicitly.
 * A device with nothing stored answers false, and no Meta call is made for it.
 */
export const mayHaveEarlierMeasurementGrant = (): boolean => earlierMeasurementPossible;

/**
 * Record a decision. In force from the moment this runs, not from when the write
 * lands. A failed write is silent: the choice holds for this launch, and the next
 * one reads nothing stored and asks again, which is the safe way round.
 */
export const saveConsent = async (choices: ConsentChoices): Promise<StoredConsent> => {
  await loadConsent();

  const consent: StoredConsent = {
    analytics: choices.analytics,
    measurement: choices.measurement,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };

  loading = Promise.resolve(consent);
  earlierMeasurementPossible = false;
  state.set({ isLoaded: true, consent });
  await store.write(consent);
  return consent;
};
