const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Native performance optimizations
config.resolver.platforms = ['ios', 'android', 'native']; // Remove web platform
config.transformer.minifierConfig = {
  // Optimize for mobile performance
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
  },
};

// Note: React Compiler is opted into via `experiments.reactCompiler` in app.json,
// which babel-preset-expo reads — nothing to configure here.

// Native-specific optimizations are handled by Expo's default configuration

module.exports = config;
