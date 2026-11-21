/**
 * What analytics remembers about this install, apart from any account:
 *
 * - the day the app was installed, sent on every event as the `install_date`
 *   super property so retention can be cut by install week;
 * - whether `First Open` has gone out, which happens once per install;
 * - which core actions have already been sent once, for `first_time`
 *   (FIRST_TIME_EVENTS).
 *
 * One device-scoped key. A sign-out, an account switch and the new anonymous id
 * that `analytics.reset()` makes all leave it alone, so a returning learner is
 * never counted as a new install or given a second set of first actions.
 *
 * NEW OR EXISTING
 * ===============
 * The first launch that finds no record decides whether this is a new install
 * or an existing user who updated into this code, from how long ago the app was
 * installed and, on Android, whether it has been updated since. An existing
 * user's first actions were long ago, so all of them start out already sent.
 *
 * A flag is written before its event goes out, so a crash between the two loses
 * one event and never sends one twice. When storage can't be read nothing is
 * claimed, and the next launch tries again.
 *
 * Mirrors services/analytics.ts: nothing here throws or logs. It reads
 * AsyncStorage directly and imports nothing that reaches services/analytics,
 * which calls into it (createJsonStore would, through utils/errorHandling).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { FIRST_TIME_EVENTS } from '@/constants/analytics';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { MILLISECONDS_PER_DAY, toLocalDateString } from '@/utils/dateTimeUtils';

export type InstallKind = 'new' | 'existing';

export interface InstallRecord {
  /** YYYY-MM-DD, on the device's calendar */
  installDate: string;
  installKind: InstallKind;
  firstOpenSent: boolean;
  /** The FIRST_TIME_EVENTS already sent once */
  firstEvents: string[];
}

/** Installed longer ago than this, and updated since: an existing user's first launch of this code. */
const NEW_INSTALL_WINDOW_MS = MILLISECONDS_PER_DAY;

let record: InstallRecord | null = null;
let loading: Promise<InstallRecord | null> | null = null;

const readInstalledAt = async (): Promise<Date | null> => {
  try {
    return await Application.getInstallationTimeAsync();
  } catch {
    return null;
  }
};

/**
 * Android records when the binary was last replaced, and one never replaced
 * can't be an upgrade however late it is first opened. iOS keeps no such
 * record, so there the age decides alone.
 */
const hasBeenUpdatedSince = async (installedAt: Date): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    const updatedAt = await Application.getLastUpdateTimeAsync();
    return updatedAt.getTime() > installedAt.getTime();
  } catch {
    return true;
  }
};

const classifyInstall = async (): Promise<InstallRecord> => {
  const installedAt = await readInstalledAt();
  const isExisting =
    installedAt !== null &&
    Date.now() - installedAt.getTime() > NEW_INSTALL_WINDOW_MS &&
    (await hasBeenUpdatedSince(installedAt));

  return {
    installDate: toLocalDateString(installedAt ?? new Date()),
    installKind: isExisting ? 'existing' : 'new',
    firstOpenSent: false,
    firstEvents: isExisting ? [...FIRST_TIME_EVENTS] : [],
  };
};

/** The stored record, or null when there is none this code recognises. */
const decodeRecord = (raw: string | null): InstallRecord | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { installDate, installKind, firstOpenSent, firstEvents } = parsed as Record<
      string,
      unknown
    >;
    if (
      typeof installDate !== 'string' ||
      (installKind !== 'new' && installKind !== 'existing') ||
      typeof firstOpenSent !== 'boolean' ||
      !Array.isArray(firstEvents)
    ) {
      return null;
    }
    return {
      installDate,
      installKind,
      firstOpenSent,
      firstEvents: firstEvents.filter((event): event is string => typeof event === 'string'),
    };
  } catch {
    return null;
  }
};

const persist = async (): Promise<void> => {
  if (!record) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_INSTALL, JSON.stringify(record));
  } catch {
    // Kept in memory for this launch; the next one may repeat what was lost.
  }
};

const readOrCreateRecord = async (): Promise<InstallRecord | null> => {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_INSTALL);
  } catch {
    // Unknown, not empty: treating it as a new install could send First Open twice.
    loading = null;
    return null;
  }

  const stored = decodeRecord(raw);
  record = stored ?? (await classifyInstall());
  if (!stored) await persist();
  return record;
};

/** This install's record, read once per launch and made on the first. Null when storage can't be read. */
export const loadInstallRecord = (): Promise<InstallRecord | null> => {
  loading ??= readOrCreateRecord();
  return loading;
};

/** True exactly once per install for each event, the first time it is sent. */
export const claimFirstTime = async (event: string): Promise<boolean> => {
  await loadInstallRecord();
  // Read after the await: a concurrent claim may already have taken it.
  if (!record || record.firstEvents.includes(event)) return false;

  record = { ...record, firstEvents: [...record.firstEvents, event] };
  void persist();
  return true;
};

/** The record, the one time First Open is due; null every other time. */
export const claimFirstOpen = async (): Promise<InstallRecord | null> => {
  await loadInstallRecord();
  if (!record || record.firstOpenSent) return null;

  record = { ...record, firstOpenSent: true };
  await persist();
  return record;
};
