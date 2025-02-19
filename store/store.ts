import { configureStore, combineReducers } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import settingsReducer from './settingsSlice';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Combine reducers (even if there's only one) so we can use a whitelist.
const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
});

// Configure redux-persist
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['theme', 'settings'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: false,
  enhancers: getDefaultEnhancers => getDefaultEnhancers().concat(devToolsEnhancer()),
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check in development
    }),
});

// Create the persistor which will be passed to PersistGate
export const persistor = persistStore(store);

// Infer the RootState and AppDispatch types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
