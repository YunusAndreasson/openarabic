// This file was previously used to polyfill splash screen functionality
// during the migration from manual splash screen handling to expo-router v5's
// internal splash screen management. Since expo-router now handles splash screens
// automatically through the expo-splash-screen plugin configuration,
// this polyfill is no longer needed and can be removed.

// The splash screen is now configured entirely through:
// - app.json: expo-splash-screen plugin configuration
// - app/_layout.tsx: SplashScreen.hideAsync() when app is ready
