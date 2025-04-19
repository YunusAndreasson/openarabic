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
    'prettier/prettier': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    'no-console': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
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

    // Performance rules
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

    // Code quality
    'sonarjs/no-identical-functions': 'off',
    'sonarjs/cognitive-complexity': 'off',
    'sonarjs/no-redundant-jump': 'off',

    // Regular expression optimization
    'optimize-regex/optimize-regex': 'off',
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
