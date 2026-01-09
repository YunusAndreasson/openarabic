import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import tseslint from 'typescript-eslint';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig([
  // Base Expo config (includes React, React Hooks, TypeScript)
  expoConfig,

  // TypeScript strict + stylistic rules
  tseslint.configs.strict,
  tseslint.configs.stylistic,

  // Project-specific TypeScript rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'unused-imports': unusedImportsPlugin,
    },
    rules: {
      // Unused imports/vars handling
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      // Type imports
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Relax strict rules that don't fit project style
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-redeclare': 'off', // Enums with same name as const allowed
      '@typescript-eslint/no-extraneous-class': 'off', // Static-only service classes used
      '@typescript-eslint/no-require-imports': 'off', // Dynamic requires used for platform-specific code
    },
  },

  // JavaScript files (config files that need require)
  {
    files: ['**/*.js', '**/*.jsx'],
    plugins: {
      'unused-imports': unusedImportsPlugin,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-require-imports': 'off', // Config files use require()
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // React rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
      },
    },
    rules: {
      'react/no-array-index-key': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-unescaped-entities': 'off',
      'import/no-duplicates': 'error', // Consolidate imports for easier refactoring
      'import/first': 'off', // Type imports after regular imports allowed
    },
  },

  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      '*.d.ts',
      '.github/',
      '__mocks__/',
      '__tests__/',
      '**/*.test.*',
      '**/*.spec.*',
      'translate/',
      'admin-dashboard/',
      'scripts/',
      'coverage/',
      'jest.setup.js',
      'jest.config.js',
      'jest.polyfills.js',
    ],
  },

  // Prettier must be last
  prettierConfig,
]);
