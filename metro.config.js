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

// Enable React Compiler optimizations
config.transformer.reactCompiler = true;

// Native-specific optimizations are handled by Expo's default configuration

module.exports = config;
