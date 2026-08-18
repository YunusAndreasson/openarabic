import { combineReducers } from '@reduxjs/toolkit';

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
export const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  playlist: playlistReducer,
  editMode: editModeReducer,
  voiceAliases: voiceAliasesReducer,
});

export type RootStateShape = ReturnType<typeof rootReducer>;

/** The slices redux-persist writes into `STORAGE_KEYS.REDUX_PERSIST_ROOT`. */
export const PERSISTED_SLICES = [
  'theme',
  'settings',
  'playlist',
  'editMode',
  'voiceAliases',
] as const satisfies readonly (keyof RootStateShape)[];
