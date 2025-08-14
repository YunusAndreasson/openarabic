module.exports = {
  preset: 'jest-expo',

  // Performance optimizations for AI agent workflows
  maxWorkers: process.env.CI ? '100%' : '50%', // Full cores in CI, half locally
  cache: true, // Enable caching for faster subsequent runs
  cacheDirectory: '<rootDir>/.jest-cache',

  // AI agent optimization flags
  detectOpenHandles: false, // Faster for AI agents
  forceExit: true, // Clean exit for automated workflows

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
    // Static file imports (mobile-only optimized)
    '\\.(jpg|jpeg|png|gif|otf|svg|ttf|mp4|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',

    // Core React Native mocks
    '@shopify/react-native-skia': '<rootDir>/__mocks__/react-native-skia.js',
    'react-native-gesture-handler': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '@sentry/react-native': '<rootDir>/__mocks__/sentry-react-native.js',
    'react-redux': '<rootDir>/__mocks__/react-redux.js',
    'expo-image': '<rootDir>/__mocks__/expo-image.js',
    'expo-linear-gradient': '<rootDir>/__mocks__/expo-linear-gradient.js',
    '@expo/vector-icons': '<rootDir>/__mocks__/@expo/vector-icons.js',
    
    // Enhanced mocks for critical dependencies
    'expo-haptics': '<rootDir>/__mocks__/expo-haptics.js',
    'expo-notifications': '<rootDir>/__mocks__/expo-notifications.js',
    'expo-audio': '<rootDir>/__mocks__/expo-audio.js',

    // Path aliases for cleaner imports
    '^@/(.*)$': '<rootDir>/$1',
    '^@read/(.*)$': '<rootDir>/components/read/$1',
    '^@listen/(.*)$': '<rootDir>/components/listen/$1',
    '^@practice/(.*)$': '<rootDir>/components/practice/$1',
    '^@account/(.*)$': '<rootDir>/components/account/$1',
    '^@article/(.*)$': '<rootDir>/components/article/$1',
    '^@common/(.*)$': '<rootDir>/components/common/$1',
    '^@ui/(.*)$': '<rootDir>/components/ui/$1',
    '^@charts/(.*)$': '<rootDir>/components/common/charts/$1',
    // Bypass strict peer check in @testing-library/react-native so renderer upgrades don't break tests
    '^@testing-library/react-native/src/helpers/ensure-peer-deps$':
      '<rootDir>/__mocks__/@testing-library/react-native-ensure-peer-deps.js',
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
