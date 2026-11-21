const { getSentryExpoConfig } = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Expo's defaults on purpose: its resolver platforms already cover iOS and
// Android (`.native.*` files resolve through Metro's preferNativePlatform, not
// through this list), and its tuned terser options are what a
// `minifierConfig` override would replace wholesale.
//
// getSentryExpoConfig is getDefaultConfig plus Sentry's serializer, which
// writes a debug ID into every bundle and its source map. Without it Sentry
// cannot match a minified frame to its map: every JS frame read
// `main.jsbundle:1` (2026-11-21), and scripts/eas-update.sh skipped the
// source-map upload for OTAs.
//
// React Compiler is opted into via `experiments.reactCompiler` in app.json,
// which babel-preset-expo reads — nothing to configure here.

module.exports = config;
