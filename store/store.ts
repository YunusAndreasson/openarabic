import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
  },
  devTools: false,
  enhancers: getDefaultEnhancers => getDefaultEnhancers().concat(devToolsEnhancer()),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
