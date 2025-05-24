const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

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
  // Enable experimental optimizations
  unstable_allowRequireContext: true,
};

// Optimize resolver for better performance
config.resolver = {
  ...config.resolver,
  // Cache node modules resolution
  hasteImplModulePath: undefined,
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

// Optimize serializer for better bundle performance
config.serializer = {
  ...config.serializer,
  // Optimize module ordering
  createModuleIdFactory: () => path => {
    // Use shorter module IDs for better performance
    return path.replace(/^.*\/node_modules\//, '').replace(/\//g, '-');
  },
  // Enable experimental optimizations
  unstable_allowRequireContext: true,
};

// Enable caching for better build performance
config.cacheStores = [
  {
    name: 'FileStore',
    options: {
      root: require('path').join(__dirname, '.metro-cache'),
    },
  },
];

// Optimize watcher for better development performance
config.watchFolders = [
  // Add any additional folders to watch
];

module.exports = config;
