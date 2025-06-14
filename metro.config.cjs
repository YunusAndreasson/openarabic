const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(process.cwd(), {
  // Enable CSS support for potential web usage
  isCSSEnabled: false, // Disabled since this is mobile-only
});

// Disable package exports resolution to avoid Node.js module issues
config.resolver.unstable_enablePackageExports = false;

// React Native 0.79 + Hermes optimizations
config.transformer = {
  ...config.transformer,
  // Optimize bundle size with better minification
  minifierConfig: {
    ...config.transformer.minifierConfig,
    compress: {
      ...config.transformer.minifierConfig?.compress,
      // Additional optimizations for mobile
      drop_console: process.env.NODE_ENV === 'production',
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
  },
};

// Optimize resolver for language learning app assets
config.resolver = {
  ...config.resolver,
  // Add audio file extensions for language learning
  assetExts: [
    ...config.resolver.assetExts,
    'wav', // Audio files for language learning
    'aac',
    'm4a',
  ],
  // Disable package exports resolution to avoid Node.js module issues
  unstable_enablePackageExports: false,
};

// Development optimizations
if (process.env.NODE_ENV === 'development') {
  // Faster development builds
  config.transformer.minifierConfig = undefined;
}

module.exports = config;
