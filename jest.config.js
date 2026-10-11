module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],

  // Transform ES modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia|@tanstack/.*|immer))',
  ],

  // Optimized timeouts for AI agent efficiency
  testTimeout: 15000, // Reduced from 30s - AI agents don't need long timeouts

  // Enhanced error reporting for AI analysis
  clearMocks: true,
  resetMocks: true, // More thorough cleanup between tests
  restoreMocks: true, // Restore original implementations

  // Disable watch mode - AI agents run tests programmatically
  watchman: false,

  // Use jest-expo default environment

  // Jest 30's globals-cleanup soft-delete wraps globals in warning proxies;
  // react-native's lazy module getters (e.g. BackHandler) can then recurse
  // inside jest-util's emitAccessWarning (constructor access re-triggers the
  // proxy) and crash the suite with a stack overflow. Disable the proxying —
  // it only produced advisory warnings.
  testEnvironmentOptions: {
    globalsCleanup: 'off',
  },

  // Enhanced path ignoring for AI focus
  testPathIgnorePatterns: [
    '/node_modules/',
    '__mocks__',
    '/coverage/',
    '/.jest-cache/',
    '/build/',
    '/dist/',
    '/admin-dashboard/',
    '/translate/',
    '/publish/',
  ],

  // Comprehensive module mapping for AI predictability
  moduleNameMapper: {
    // Static file imports (mobile-only optimized)
    '\\.(jpg|jpeg|png|gif|otf|svg|ttf|mp4|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',

    // Immer mocks
    '^immer$': '<rootDir>/__mocks__/immer.js',
    '^immer/(.*)$': '<rootDir>/__mocks__/immer.js',

    // Core React Native mocks
    '@shopify/react-native-skia': '<rootDir>/__mocks__/react-native-skia.js',
    'react-native-gesture-handler': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    // NOTE: react-native-reanimated is intentionally NOT mapped here. It is mocked
    // in jest.setup.js, which is the richer of the two mocks that used to coexist
    // (this mapper's target lacked useDerivedValue/useAnimatedReaction/interpolateColor).
    '@sentry/react-native': '<rootDir>/__mocks__/sentry-react-native.js',
    'react-redux': '<rootDir>/__mocks__/react-redux.js',
    'expo-image': '<rootDir>/__mocks__/expo-image.js',
    '@expo/vector-icons': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '@react-native-vector-icons/ionicons':
      '<rootDir>/__mocks__/react-native-vector-icons-ionicons.js',

    // Expo Router native tabs mock
    'expo-router/unstable-native-tabs': '<rootDir>/__mocks__/expo-router-native-tabs.js',

    // @expo/ui ships untranspiled TS source, so a real import pulls
    // expo/src/Expo.fx.tsx (and an undefined EXDevLauncher) into the module graph.
    '@expo/ui/community/datetime-picker': '<rootDir>/__mocks__/expo-ui-datetime-picker.js',

    // Enhanced mocks for critical dependencies
    'expo-haptics': '<rootDir>/__mocks__/expo-haptics.js',
    'expo-notifications': '<rootDir>/__mocks__/expo-notifications.js',
    'expo-audio': '<rootDir>/__mocks__/expo-audio.js',
    'expo-asset': '<rootDir>/__mocks__/expo-asset.js',

    // Voice grading native modules
    'react-native-audio-api': '<rootDir>/__mocks__/react-native-audio-api.js',
    // Ships untransformed ESM; only the handful of calls the app makes are mocked.
    '^@dr\\.pogodin/react-native-fs$': '<rootDir>/__mocks__/@dr.pogodin/react-native-fs.js',
    '^react-native-sherpa-onnx$': '<rootDir>/__mocks__/react-native-sherpa-onnx.js',
    // Reaches for a JSI installer at import time, so the real module cannot be
    // loaded under Jest at all — not even to be spied on.
    '^react-native-executorch$': '<rootDir>/__mocks__/react-native-executorch.js',
    '^react-native-sherpa-onnx/download$':
      '<rootDir>/__mocks__/react-native-sherpa-onnx-download.js',
    '^react-native-sherpa-onnx/stt$': '<rootDir>/__mocks__/react-native-sherpa-onnx-stt.js',

    // Path aliases for cleaner imports
    '^@/(.*)$': '<rootDir>/$1',
    '^@library/(.*)$': '<rootDir>/components/library/$1',
    '^@bookmarks/(.*)$': '<rootDir>/components/bookmarks/$1',
    '^@study/(.*)$': '<rootDir>/components/study/$1',
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
  // NOTE: babel-jest automatically uses babel.config.js
  // Only specify test-specific transforms here
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: ['babel-preset-expo'],
        plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
      },
    ],
  },

  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 30,
      statements: 30,
    },
    // Per-directory thresholds for targeted coverage improvements
    './utils/**/*.ts': {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    './hooks/**/*.ts': {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    './services/**/*.ts': {
      branches: 45,
      functions: 55,
      lines: 55,
      statements: 55,
    },
  },

  // Enhanced reporting for AI analysis
  reporters: [
    [
      'default',
      {
        // Optimize output for AI agent parsing
        summaryThreshold: 0, // Always show detailed summary for AI analysis
      },
    ],
    // Note: jest-junit can be added when needed: yarn add --dev jest-junit
  ],

  // Optimize test result processor for AI actionability
  testResultsProcessor: undefined, // Can be customized for AI-specific output

  // Coverage reporting optimized for AI parsing
  coverageReporters: ['text', 'text-summary', 'lcov', 'json', 'json-summary'],

  // Verbose output for AI debugging - show individual test results
  verbose: true,

  // Error handling optimized for AI analysis
  errorOnDeprecated: true,

  // Display test names and paths for AI agent navigation
  displayName: undefined,

  // Show full diff on assertion failures for AI analysis
  expand: false, // Set to true in CI for full diffs

  // Notify mode disabled for automated workflows
  notify: false,
  notifyMode: 'failure-change',

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
