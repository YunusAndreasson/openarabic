/**
 * Fix for expo-router v5.0.7 + React Native 0.79.3 splash screen compatibility issue
 * Polyfill missing internal splash screen functions to prevent expo-router crashes
 */

import { requireOptionalNativeModule } from 'expo';

// Apply polyfill for missing splash screen functions
const SplashModule = requireOptionalNativeModule('ExpoSplashScreen');
if (SplashModule) {
  // Add missing internal functions that expo-router expects
  SplashModule.internalPreventAutoHideAsync =
    SplashModule.internalPreventAutoHideAsync || (() => Promise.resolve());
  SplashModule.internalMaybeHideAsync =
    SplashModule.internalMaybeHideAsync || (() => Promise.resolve());
}

export {}; // Make this a module
