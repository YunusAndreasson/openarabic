import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import type { PersistConfig } from 'redux-persist/es/types';

import { getSafeStorage } from '@/utils/safeAsyncStorage';

import editModeReducer from './editModeSlice';
import filtersReducer from './filtersSlice';
import listenReducer from './listenSlice';
import settingsReducer from './settingsSlice';
import themeReducer from './themeSlice';

// Combine reducers (even if there's only one) so we can use a whitelist.
const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  filters: filtersReducer,
  listen: listenReducer,
  editMode: editModeReducer,
});

type RootStateShape = ReturnType<typeof rootReducer>;

// Configure redux-persist - simplified for unreleased app
const persistConfig: PersistConfig<RootStateShape> = {
  key: 'root-v3', // Fresh key for unreleased app
  storage: getSafeStorage(),
  whitelist: ['theme', 'settings', 'filters', 'listen', 'editMode'],
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
