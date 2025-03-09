// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier', 'react-native'],
  rules: {
    'prettier/prettier': 'error',
    // Add some common helpful rules
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': ['warn', { skip: ['ThemedText'] }],
    // Prevent imports from deprecated utils/animations.ts
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '../utils/animations',
            message:
              'Please import animation hooks from @/hooks/animations instead. See docs/hooks-migration-guide.md',
          },
          {
            name: '../../utils/animations',
            message:
              'Please import animation hooks from @/hooks/animations instead. See docs/hooks-migration-guide.md',
          },
          {
            name: '@/utils/animations',
            message:
              'Please import animation hooks from @/hooks/animations instead. See docs/hooks-migration-guide.md',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['/dist/*', 'node_modules', '.expo', '.github'],
  env: {
    node: true,
    browser: true,
    'react-native/react-native': true,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
};
