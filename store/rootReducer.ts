import { combineReducers } from '@reduxjs/toolkit';

import { accountSwitched } from '@/store/accountActions';

import editModeReducer from '@/store/editModeSlice';
import playlistReducer from '@/store/playlistSlice';
import settingsReducer from '@/store/settingsSlice';
import themeReducer from '@/store/themeSlice';
import voiceAliasesReducer from '@/store/voiceAliasesSlice';

/**
 * The slice map, kept in its own module so the test store can share it.
 *
 * `store/store.ts` cannot be imported from a test helper: it calls
 * `persistStore()` at module scope, so importing it boots redux-persist against
 * AsyncStorage in every suite that touches redux. The test helper used to
 * re-declare `combineReducers` instead, and drifted — it was missing
 * `voiceAliases` entirely, so anything reading that slice under test saw
 * `undefined` from a store the app never produces. One definition, no side
 * effects, both consumers.
 */
const sliceReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  playlist: playlistReducer,
  editMode: editModeReducer,
  voiceAliases: voiceAliasesReducer,
});

// On an account switch every slice but the theme returns to its initial state:
// settings, the playlist and the learned voice aliases belong to whoever made
// them, and one persisted blob holds them for the whole device. The theme is
// the device's, so it stays.
export const rootReducer: typeof sliceReducer = (state, action) =>
  sliceReducer(accountSwitched.match(action) && state ? { theme: state.theme } : state, action);

export type RootStateShape = ReturnType<typeof rootReducer>;

/** The slices redux-persist writes into `STORAGE_KEYS.REDUX_PERSIST_ROOT`. */
export const PERSISTED_SLICES = [
  'theme',
  'settings',
  'playlist',
  'editMode',
  'voiceAliases',
] as const satisfies readonly (keyof RootStateShape)[];
