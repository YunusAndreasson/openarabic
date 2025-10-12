import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import type { PersistConfig } from 'redux-persist/es/types';

import editModeReducer from '@/store/editModeSlice';
import filtersReducer from '@/store/filtersSlice';
import playlistReducer from '@/store/playlistSlice';
import settingsReducer from '@/store/settingsSlice';
import themeReducer from '@/store/themeSlice';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

// Combine reducers (even if there's only one) so we can use a whitelist.
const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  filters: filtersReducer,
  playlist: playlistReducer,
  editMode: editModeReducer,
});

type RootStateShape = ReturnType<typeof rootReducer>;

// State migration to handle removed slices
const stateMigration = (state: any) => {
  if (!state) return state;

  try {
    // Remove old slices that no longer exist
    const { readingList, listen, ...validState } = state;

    // Only return state with valid keys
    const cleanedState: Partial<RootStateShape> = {};
    const validKeys = ['theme', 'settings', 'filters', 'playlist', 'editMode'];

    for (const key of validKeys) {
      if (key in validState) {
        cleanedState[key as keyof RootStateShape] = validState[key];
      }
    }

    return cleanedState;
  } catch (error) {
    // If migration fails, return empty state and let reducers initialize with defaults
    console.warn('State migration failed, using default state:', error);
    return undefined;
  }
};

// Configure redux-persist
const persistConfig: PersistConfig<RootStateShape> = {
  key: 'root',
  version: 1, // Increment when schema changes
  storage: getSafeStorage(),
  whitelist: ['theme', 'settings', 'filters', 'playlist', 'editMode'],
  migrate: async (state: any) => {
    try {
      const migratedState = stateMigration(state);
      return migratedState;
    } catch (error) {
      console.warn('State migration error:', error);
      // Return undefined to use default state
      return undefined;
    }
  },
  // Add timeout to prevent hanging during migration
  timeout: 10000,
};

const persistedReducer = persistReducer<RootStateShape>(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Create the persistor which will be passed to PersistGate
export const persistor = persistStore(store);

// Infer the RootState and AppDispatch types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
