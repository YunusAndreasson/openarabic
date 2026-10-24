const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo's defaults on purpose: its resolver platforms already cover iOS and
// Android (`.native.*` files resolve through Metro's preferNativePlatform, not
// through this list), and its tuned terser options are what a
// `minifierConfig` override would replace wholesale.
//
// React Compiler is opted into via `experiments.reactCompiler` in app.json,
// which babel-preset-expo reads — nothing to configure here.

module.exports = config;
