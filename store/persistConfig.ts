import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMigrate, type MigrationManifest, type PersistedState } from 'redux-persist';
import type { PersistConfig } from 'redux-persist/es/types';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';

import { REDUX_PERSIST_KEY } from '@/constants/storageKeys';
import { PERSISTED_SLICES, type RootStateShape } from '@/store/rootReducer';

/**
 * How the persisted store is read back, in its own module so a test can run
 * the real reconciler and migrations: `store/store.ts` boots redux-persist at
 * import time.
 *
 * RECONCILER. `autoMergeLevel2` merges each slice onto its initial state, so a
 * settings field added after an install was persisted reads its shipped default
 * instead of `undefined`. Left unset, redux-persist falls back to
 * `autoMergeLevel1`, which hands the stored slice back verbatim: every field
 * added since a learner's first launch read `undefined`, and that bug shipped
 * four times (haptics, adaptive pacing, the energy gate and gain, hands-free)
 * before this. A slice whose reducer changes it on REHYDRATE is still skipped
 * by both levels, which is how `editModeSlice` keeps discarding its legacy
 * persisted copy.
 *
 * VERSION 2, not 1. Builds 984f7fc6 to f9008618 (October 2025) stored
 * `_persist.version: 1`, and `createMigrate` only runs migrations keyed above
 * the stored version. Every other install stored no version, which reads -1.
 */
export const PERSIST_VERSION = 2;

/** Narrowed by hand: a corrupt blob is not a reason to throw away the whole store. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Pin voice OFF for installs whose settings predate the `voiceEnabled` field.
 *
 * Voice answers shipped on 2026-05-29, default OFF, and were switched to
 * default ON on 2026-08-22. Under level 1 an install persisted before the field
 * existed read it as `undefined`, which every reader treated as off, so those
 * learners never had voice or the ~103 MB model prefetch switched on for them.
 * Under level 2 the missing field would take the new install default, `true`.
 * This writes down the value those learners have been living with.
 *
 * It must never throw: a migration error makes redux-persist rehydrate with no
 * state at all, and the next write would replace the stored blob with defaults.
 */
const pinVoiceOffForPreVoiceSettings = (state: PersistedState): PersistedState => {
  if (!state || !('settings' in state)) return state;
  const { settings } = state;
  if (!isRecord(settings) || 'voiceEnabled' in settings) return state;
  // Named so the slice it adds is typed: PersistedState declares only `_persist`.
  const migrated: NonNullable<PersistedState> & { settings: Record<string, unknown> } = {
    ...state,
    settings: { ...settings, voiceEnabled: false },
  };
  return migrated;
};

export const PERSIST_MIGRATIONS: MigrationManifest = {
  2: pinVoiceOffForPreVoiceSettings,
};

export const persistConfig: PersistConfig<RootStateShape> = {
  key: REDUX_PERSIST_KEY,
  storage: AsyncStorage,
  whitelist: [...PERSISTED_SLICES],
  version: PERSIST_VERSION,
  migrate: createMigrate(PERSIST_MIGRATIONS),
  stateReconciler: autoMergeLevel2,
};
