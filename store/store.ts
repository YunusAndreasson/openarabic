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

import { persistConfig } from '@/store/persistConfig';
import { rootReducer, type RootStateShape } from '@/store/rootReducer';

// The config (reconciler, version, migrations) lives in its own module so a
// test can run it — see store/persistConfig.ts.
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
