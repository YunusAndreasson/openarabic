module.exports = {
  preset: 'jest-expo',

  // Performance optimizations for AI agent workflows
  maxWorkers: '50%', // Use half available cores for faster parallel execution
  cache: true, // Enable caching for faster subsequent runs
  cacheDirectory: '<rootDir>/.jest-cache',

  // Transform patterns optimized for common React Native + Expo patterns
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia|@tanstack/.*)',
  ],

  setupFilesAfterEnv: ['./jest.setup.js'],

  // Optimized timeouts for AI agent efficiency
  testTimeout: 15000, // Reduced from 30s - AI agents don't need long timeouts

  // Enhanced error reporting for AI analysis
  clearMocks: true,
  resetMocks: true, // More thorough cleanup between tests
  restoreMocks: true, // Restore original implementations

  // Fail fast for AI efficiency - don't waste time on multiple failures
  bail: 1, // Stop after first failure for faster feedback

  // Disable watch mode - AI agents run tests programmatically
  watchman: false,

  // Optimized test environment
  testEnvironment: 'node',

  // Enhanced path ignoring for AI focus
  testPathIgnorePatterns: [
    '/node_modules/',
    '__mocks__',
    '/coverage/',
    '/.jest-cache/',
    '/build/',
    '/dist/',
  ],

  // Comprehensive module mapping for AI predictability
  moduleNameMapper: {
    // Static file imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',

    // Core React Native mocks
    '@shopify/react-native-skia': '<rootDir>/__mocks__/react-native-skia.js',
    'react-native-reanimated': '<rootDir>/__mocks__/react-native-reanimated.js',
    'react-native-gesture-handler': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '@sentry/react-native': '<rootDir>/__mocks__/sentry-react-native.js',
    'react-redux': '<rootDir>/__mocks__/react-redux.js',
    'expo-image': '<rootDir>/__mocks__/expo-image.js',
    'expo-linear-gradient': '<rootDir>/__mocks__/expo-linear-gradient.js',

    // Path aliases for cleaner imports
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Comprehensive coverage for AI analysis
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'services/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    'store/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**',
    '!**/*.d.ts',
    '!**/coverage/**',
  ],

  // Enhanced transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: ['babel-preset-expo'],
        plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
      },
    ],
  },

  // AI-optimized coverage thresholds - realistic but enforced
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 30,
      statements: 30,
    },
  },

  // Enhanced reporting for AI analysis
  reporters: [
    'default',
    // Note: jest-junit can be added when needed: yarn add --dev jest-junit
  ],

  // Coverage reporting optimized for AI parsing
  coverageReporters: ['text', 'text-summary', 'lcov', 'json', 'json-summary'],

  // Verbose output for AI debugging
  verbose: true,

  // Error handling optimized for AI analysis
  errorOnDeprecated: true,

  // Module file extensions in priority order
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Globals for consistent test environment
  globals: {
    __DEV__: true,
    __TEST__: true,
  },

  // Test match patterns optimized for AI discovery
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)', '**/*.(test|spec).(ts|tsx|js|jsx)'],

  // Setup files for consistent environment
  setupFiles: ['<rootDir>/jest.polyfills.js'],
};
