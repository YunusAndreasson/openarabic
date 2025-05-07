import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import importPlugin from 'eslint-plugin-import';
import expoConfig from 'eslint-config-expo';

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  ...compat.extends('plugin:react/recommended'),
  ...compat.extends('plugin:react-hooks/recommended'),
  ...compat.extends('plugin:react-native/all'),
  ...compat.extends('plugin:import/errors'),
  ...compat.extends('plugin:import/warnings'),
  ...compat.extends('plugin:import/typescript'),
  ...compat.extends('eslint-config-expo'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,
      import: importPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      'no-console': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react-native/no-unused-styles': 'warn',
      'react-native/split-platform-components': 'warn',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
      'react-native/no-raw-text': ['warn', { skip: ['ThemedText'] }],
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-bind': 'off',
      'react/no-array-index-key': 'warn',
      'react/jsx-key': 'error',
      'react/jsx-fragments': 'off',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'import/no-unresolved': 'warn',
      'import/named': 'warn',
      'import/no-duplicates': 'warn',
      'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
      'react/jsx-no-constructed-context-values': 'warn',
      'react/no-unused-prop-types': 'warn',
      'react/jsx-no-useless-fragment': 'off',
      'react/no-object-type-as-default-prop': 'warn',
      'react/jsx-no-script-url': 'error',
      'react/no-danger': 'error',
      'react/no-arrow-function-lifecycle': 'warn',
      'react/no-invalid-html-attribute': 'warn',
      'react/no-namespace': 'warn',
      'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'web-build/', '*.d.ts', '.github', '*.config.js'],
  },
];
