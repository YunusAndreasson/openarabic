const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(process.cwd());

// Disable package exports resolution to avoid Node.js module issues
config.resolver.unstable_enablePackageExports = false;

// React Native 0.79 performance optimizations
config.transformer = {
  ...config.transformer,
  // Enable Hermes bytecode compilation for better performance
  hermesCommand: 'hermes',
  // Optimize bundle size
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    compress: {
      reduce_funcs: false,
    },
  },
};

// Optimize resolver for better performance
config.resolver = {
  ...config.resolver,
  // Optimize asset resolution
  assetExts: [
    ...config.resolver.assetExts,
    'bin',
    'txt',
    'jpg',
    'png',
    'json',
    'mp4',
    'mp3',
    'ttf',
    'otf',
    'woff',
    'woff2',
  ],
  // Optimize source extensions
  sourceExts: [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json', 'cjs', 'mjs'],
  // Enable symlinks for better development experience
  unstable_enableSymlinks: true,
};

module.exports = config;
