import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';
import type { PersistConfig } from 'redux-persist/es/types';

import { REDUX_PERSIST_KEY } from '@/constants/storageKeys';
import { PERSISTED_SLICES, rootReducer, type RootStateShape } from '@/store/rootReducer';

// Configure redux-persist
const persistConfig: PersistConfig<RootStateShape> = {
  key: REDUX_PERSIST_KEY,
  storage: AsyncStorage,
  whitelist: [...PERSISTED_SLICES],
};

const persistedReducer = persistReducer<RootStateShape>(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // Documented redux-persist pattern: keep the serializable check on for app
      // state/actions, ignoring only redux-persist's own lifecycle actions
      // (which carry non-serializable payloads by design). All slice state is
      // plain JSON (primitives, plain objects, number arrays), so no
      // ignoredPaths are needed.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create the persistor which will be passed to PersistGate
export const persistor = persistStore(store);

// Infer the RootState and AppDispatch types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
