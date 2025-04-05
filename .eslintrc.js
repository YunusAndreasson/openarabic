module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:jest/recommended',
    'expo',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    'prettier',
    'react-native',
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
    'jest',
    'sonarjs',
    'optimize-regex',
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    'no-console': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': ['warn', { skip: ['ThemedText'] }],
    'react/react-in-jsx-scope': 'off',
    'react/jsx-no-bind': ['warn', { allowArrowFunctions: true }],
    'react/no-array-index-key': 'warn',
    'react/jsx-key': 'error',
    'react/jsx-fragments': ['warn', 'syntax'],
    'import/order': [
      'error',
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
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/no-duplicates': 'error',

    // Performance rules
    'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
    'react/jsx-no-constructed-context-values': 'error',
    'react/no-unused-prop-types': 'warn',
    'react/jsx-no-useless-fragment': 'warn',
    'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],
    'react/no-object-type-as-default-prop': 'error',
    'react/jsx-no-script-url': 'error',
    'react/no-danger': 'error',
    'react/no-arrow-function-lifecycle': 'error',
    'react/no-invalid-html-attribute': 'error',
    'react/no-namespace': 'error',
    'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],

    // Code quality
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-redundant-jump': 'warn',

    // Regular expression optimization
    'optimize-regex/optimize-regex': 'warn',
  },
  ignorePatterns: ['/dist/*', 'node_modules', '.expo', '.github', '*.config.js', '*.d.ts'],
  env: {
    node: true,
    browser: true,
    'react-native/react-native': true,
    jest: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', '.'],
      },
      'babel-module': {
        alias: {
          '@': './',
        },
      },
    },
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
    },
    {
      files: ['*.js', '*.jsx', '*.mjs', '*.cjs'],
      parser: 'espree',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      },
    },
  ],
};
