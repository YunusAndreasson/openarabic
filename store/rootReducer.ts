import { combineReducers } from '@reduxjs/toolkit';

import { accountSwitched } from '@/store/accountActions';

import guestLibraryReducer from '@/store/guestLibrarySlice';
import firstPageReducer from '@/store/firstPageSlice';
import editModeReducer from '@/store/editModeSlice';
import playlistReducer from '@/store/playlistSlice';
import settingsReducer, { deviceSettings } from '@/store/settingsSlice';
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
  firstPage: firstPageReducer,
  guestLibrary: guestLibraryReducer,
  theme: themeReducer,
  settings: settingsReducer,
  playlist: playlistReducer,
  editMode: editModeReducer,
  voiceAliases: voiceAliasesReducer,
});

// Reading position and appearance belong to the device. Reset private study,
// playback and voice state when the account changes.
export const rootReducer: typeof sliceReducer = (state, action) =>
  sliceReducer(
    accountSwitched.match(action) && state
      ? {
          theme: state.theme,
          firstPage: state.firstPage,
          guestLibrary: state.guestLibrary,
          settings: deviceSettings(state.settings),
        }
      : state,
    action,
  );

export type RootStateShape = ReturnType<typeof rootReducer>;

/** The slices redux-persist writes into `STORAGE_KEYS.REDUX_PERSIST_ROOT`. */
export const PERSISTED_SLICES = [
  'firstPage',
  'guestLibrary',
  'theme',
  'settings',
  'playlist',
  'voiceAliases',
] as const satisfies readonly (keyof RootStateShape)[];
