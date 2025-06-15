import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import type { PersistedState } from 'redux-persist';
import type { PersistConfig } from 'redux-persist/es/types';

import { getSafeStorage } from '@/utils/safeAsyncStorage';

import filtersReducer from './filtersSlice';
import listenReducer from './listenSlice';
import readingListReducer from './readingListSlice';
import settingsReducer from './settingsSlice';
import themeReducer from './themeSlice';

// Combine reducers (even if there's only one) so we can use a whitelist.
const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  readingList: readingListReducer,
  filters: filtersReducer,
  listen: listenReducer,
});

// Migration function for settings
type RootStateShape = ReturnType<typeof rootReducer>;

const migrations: { 0: (state: RootStateShape) => RootStateShape } = {
  0: (state: RootStateShape): RootStateShape => {
    // Ensure settings has reminderTime property
    if (state.settings && !state.settings.reminderTime) {
      state.settings.reminderTime = {
        hour: 19,
        minute: 0,
        enabled: false,
      };
    }
    // Ensure settings has arabicFont property
    if (state.settings && !state.settings.arabicFont) {
      state.settings.arabicFont = 'Madina';
    }
    // Ensure settings has arabicFontSize property
    if (state.settings && !state.settings.arabicFontSize) {
      state.settings.arabicFontSize = 17; // LAYOUT.TYPOGRAPHY.SCALE.LARGE
    }
    return state;
  },
};

// Configure redux-persist
const persistConfig: PersistConfig<RootStateShape> = {
  key: 'root',
  storage: getSafeStorage(),
  version: 0,
  migrate: (state: PersistedState): Promise<PersistedState> => {
    const typedState = state as (RootStateShape & PersistedState) | undefined;
    if (
      typedState &&
      typedState.settings &&
      (!typedState.settings.reminderTime ||
        !typedState.settings.arabicFont ||
        !typedState.settings.arabicFontSize)
    ) {
      const migrated = migrations[0](typedState);
      return Promise.resolve({ ...state, ...migrated } as PersistedState);
    }
    return Promise.resolve(state);
  },
  whitelist: ['theme', 'settings', 'readingList', 'filters', 'listen'],
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
