module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Set a global timeout for all tests
  testTimeout: 5000,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Bail after the first test failure
  bail: false,
  // Use a more realistic test environment for React Native components
  testEnvironment: 'jsdom',
  // Mock modules that cause issues
  moduleNameMapper: {
    // Mock static file imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'identity-obj-proxy',
    // Mock style imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  // Collect coverage from specific directories
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'services/**/*.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
};
