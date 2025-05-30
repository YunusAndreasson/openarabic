import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';

import audioReducer from './audioSlice';
import featuredContentReducer from './featuredContentSlice';
import readingListReducer from './readingListSlice';
import settingsReducer from './settingsSlice';
import themeReducer from './themeSlice';

// Combine reducers (even if there's only one) so we can use a whitelist.
const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  readingList: readingListReducer,
  featuredContent: featuredContentReducer,
  audio: audioReducer,
});

// Migration function for settings
const migrations = {
  0: (state: any) => {
    // Ensure settings has reminderTime property
    if (state.settings && !state.settings.reminderTime) {
      state.settings.reminderTime = {
        hour: 19,
        minute: 0,
        enabled: false,
      };
    }
    return state;
  },
};

// Configure redux-persist
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  version: 0,
  migrate: (state: any) => {
    // Apply migration if needed
    if (state && state.settings && !state.settings.reminderTime) {
      return migrations[0](state);
    }
    return Promise.resolve(state);
  },
  whitelist: ['theme', 'settings', 'readingList', 'featuredContent'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

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
