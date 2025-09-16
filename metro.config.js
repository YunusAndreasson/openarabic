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

// Optimize for native builds
config.serializer.customSerializer = require('@expo/metro-runtime').createSerializer({
  // Native-specific optimizations
  createModuleIdFactory: () => path => {
    // Optimize module ID generation for native
    return path.replace(__dirname, '').replace(/\\/g, '/');
  },
});

module.exports = config;
