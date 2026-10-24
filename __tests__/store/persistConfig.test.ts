/**
 * The persisted store, read back the way the app reads it.
 *
 * These run the REAL redux-persist pipeline — stored blob → getStoredState →
 * createMigrate → autoMergeLevel2 → the app's root reducer — against an
 * in-memory storage. Nothing here goes through react-redux (mapped to a
 * fixed-state stub under jest), and nothing imports store/store.ts, which
 * boots redux-persist against AsyncStorage at import time.
 *
 * What they pin down:
 * - a settings field added after an install was persisted reads its shipped
 *   default, not `undefined` (the bug class that shipped four times under the
 *   library's default autoMergeLevel1);
 * - installs whose settings predate `voiceEnabled` keep voice OFF, which is
 *   what they have read all along, instead of inheriting the new default ON;
 * - the legacy persisted edit mode is still discarded.
 */

// jest.setup.js replaces persistReducer/persistStore with pass-through stubs
// so that importing the app's store never touches AsyncStorage. This suite is
// about the real pipeline, so it takes the real module back.
jest.unmock('redux-persist');

import { describe, expect, jest, test } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, type PersistedState } from 'redux-persist';

import { REDUX_PERSIST_KEY } from '@/constants/storageKeys';
import { PERSIST_MIGRATIONS, PERSIST_VERSION, persistConfig } from '@/store/persistConfig';
import { rootReducer } from '@/store/rootReducer';

const STORAGE_KEY = `persist:${REDUX_PERSIST_KEY}`;

/** Exactly what createPersistoid writes: each slice serialised, then the map. */
const storedBlob = (slices: Record<string, unknown>): string =>
  JSON.stringify(
    Object.fromEntries(Object.entries(slices).map(([key, value]) => [key, JSON.stringify(value)])),
  );

const memoryStorage = (initial: Record<string, string>) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: async (key: string) => {
      data.delete(key);
    },
  };
};

/** Boot a store over `slices` as if the app had just launched on that blob. */
async function rehydrate(slices: Record<string, unknown>) {
  const storage = memoryStorage({ [STORAGE_KEY]: storedBlob(slices) });
  // `timeout: 0` drops redux-persist's 5 s safety timer, which would otherwise
  // outlive the test.
  const reducer = persistReducer({ ...persistConfig, storage, timeout: 0 }, rootReducer);
  const store = configureStore({
    reducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
  });
  await new Promise<void>(resolve => {
    persistStore(store, null, resolve);
  });
  return store.getState();
}

/** A `settings` slice as an install from before 2026-05-29 persisted it. */
const preVoiceSettings = {
  reminderTime: { hour: 8, minute: 30, enabled: true },
  arabicFont: 'Amiri-Regular',
  arabicFontSize: 24,
  audioLanguagePreference: 'arabic',
  audioShuffleEnabled: true,
  dailyWordLimit: 5,
};

const unversioned = { version: -1, rehydrated: true };

describe('persisted store rehydration', () => {
  test('an install from before voice keeps voice off, and gains every later default', async () => {
    const state = await rehydrate({
      settings: preVoiceSettings,
      theme: { theme: 'sepia' },
      _persist: unversioned,
    });

    // What these learners have read all along — `undefined`, treated as off —
    // now written down, instead of the new install default ON.
    expect(state.settings.voiceEnabled).toBe(false);
    // Everything stored survives.
    expect(state.settings).toMatchObject(preVoiceSettings);
    expect(state.theme.theme).toBe('sepia');
    // Fields added since then take their shipped defaults instead of `undefined`.
    expect(state.settings.hapticsEnabled).toBe(true);
    expect(state.settings.adaptiveNewWordPacingEnabled).toBe(true);
    expect(state.settings.voiceHandsFree).toBe(true);
    expect(state.settings.voiceEnergyGateEnabled).toBe(true);
    expect(state.settings.voiceGainNormalizeEnabled).toBe(true);
    expect(state.settings.wordTapShowsTooltip).toBe(false);
  });

  test('the October 2025 builds that stored version 1 are migrated too', async () => {
    const state = await rehydrate({
      settings: preVoiceSettings,
      _persist: { version: 1, rehydrated: true },
    });

    expect(state.settings.voiceEnabled).toBe(false);
  });

  test('a stored voiceEnabled is kept as stored, either way', async () => {
    const on = await rehydrate({
      settings: { ...preVoiceSettings, voiceEnabled: true },
      _persist: unversioned,
    });
    const off = await rehydrate({
      settings: { ...preVoiceSettings, voiceEnabled: false },
      _persist: unversioned,
    });

    expect(on.settings.voiceEnabled).toBe(true);
    expect(off.settings.voiceEnabled).toBe(false);
  });

  test('a default-ON field missing from the stored slice reads ON', async () => {
    // Persisted after voice shipped, before hands-free and haptics existed.
    const state = await rehydrate({
      settings: { ...preVoiceSettings, voiceEnabled: true },
      _persist: unversioned,
    });

    expect(state.settings.voiceHandsFree).toBe(true);
    expect(state.settings.hapticsEnabled).toBe(true);
  });

  test('a store already at the current version is not migrated again', async () => {
    const state = await rehydrate({
      settings: preVoiceSettings,
      _persist: { version: PERSIST_VERSION, rehydrated: true },
    });

    expect(state.settings.voiceEnabled).toBe(true);
  });

  test('the legacy persisted edit mode is still discarded', async () => {
    const state = await rehydrate({
      settings: { ...preVoiceSettings, voiceEnabled: true },
      editMode: { playlist: true },
      _persist: unversioned,
    });

    expect(state.editMode.playlist).toBe(false);
  });

  test('a fresh install starts from the initial state', async () => {
    const storage = memoryStorage({});
    const reducer = persistReducer({ ...persistConfig, storage, timeout: 0 }, rootReducer);
    const store = configureStore({
      reducer,
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
    });
    await new Promise<void>(resolve => {
      persistStore(store, null, resolve);
    });

    expect(store.getState().settings.voiceEnabled).toBe(true);
  });
});

describe('migration 2', () => {
  const migrate = PERSIST_MIGRATIONS[2];
  if (!migrate) throw new Error('migration 2 is missing');

  const persisted = (rest: Record<string, unknown>): PersistedState =>
    ({ _persist: unversioned, ...rest }) as PersistedState;

  test('never throws on a corrupt slice — a throw would discard the whole store', () => {
    const corrupt = persisted({ settings: 'not an object', theme: { theme: 'light' } });

    expect(() => migrate(corrupt)).not.toThrow();
    expect(migrate(corrupt)).toBe(corrupt);
  });

  test('leaves a store with no settings slice alone', () => {
    const themeOnly = persisted({ theme: { theme: 'dark' } });

    expect(migrate(themeOnly)).toBe(themeOnly);
    expect(migrate(undefined)).toBeUndefined();
  });
});
