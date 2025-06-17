module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Set a global timeout for all tests
  testTimeout: 30000,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Bail after the first test failure
  bail: false,
  // Disable watch mode by default
  watchman: false,
  // Use a more realistic test environment for React Native
  testEnvironment: 'node',
  // Ignore specific paths for tests
  testPathIgnorePatterns: ['/node_modules/', '__mocks__'],
  // Mock modules that cause issues
  moduleNameMapper: {
    // Mock static file imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    // Mock problematic libraries
    '@shopify/react-native-skia': '<rootDir>/__mocks__/react-native-skia.js',
    'react-native-reanimated': '<rootDir>/__mocks__/react-native-reanimated.js',
    'react-native-gesture-handler': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '@sentry/react-native': '<rootDir>/__mocks__/sentry-react-native.js',
    'react-redux': '<rootDir>/__mocks__/react-redux.js',
    'expo-image': '<rootDir>/__mocks__/expo-image.js',
    'expo-linear-gradient': '<rootDir>/__mocks__/expo-linear-gradient.js',
  },
  // Collect coverage from specific directories
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'services/**/*.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
  // Transform timeout
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  // Fail tests if coverage drops below these thresholds
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 20,
      statements: 20,
    },
  },
};
