import { fixupPluginRules } from '@eslint/compat';
import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import { configs as tseslintConfigs, parser as tsParser } from 'typescript-eslint';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

// Patch eslint-plugin-react for ESLint 10 compatibility (getFilename → filename)
const patchedExpoConfig = expoConfig.map(item => {
  if (item.plugins?.react) {
    return {
      ...item,
      plugins: {
        ...item.plugins,
        react: fixupPluginRules(item.plugins.react),
      },
    };
  }
  return item;
});

export default defineConfig([
  // Base Expo config (includes React, React Hooks, TypeScript)
  patchedExpoConfig,

  // TypeScript strict + stylistic rules
  tseslintConfigs.strict,
  tseslintConfigs.stylistic,

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
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Relax strict rules that don't fit project style
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-redeclare': 'off', // Enums with same name as const allowed
      '@typescript-eslint/no-extraneous-class': 'off', // Static-only service classes used
      '@typescript-eslint/no-require-imports': 'off', // Dynamic requires used for platform-specific code
    },
  },

  // Type-aware rules. These need the TypeScript program, so they are scoped to
  // .ts/.tsx only and cost more than syntactic rules — `eslint --cache` absorbs it.
  //
  // Split by how mechanical the fix is:
  //   error — provably redundant, autofixable, no judgment needed.
  //   warn  — real signal but each hit needs a human call, so it must not block CI
  //           while the existing backlog is burned down. Do not let these grow.
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- mechanical: redundant syntax the type system proves is dead ---
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-template-expression': 'error',
      '@typescript-eslint/no-duplicate-type-constituents': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/related-getter-setter-pairs': 'error',

      // --- correctness: measured at zero, kept there so regressions can't land ---
      // `throw 'string'` and `Promise.reject('string')` both produce Sentry issues
      // with no stack; `unbound-method` catches `onPress={obj.method}` losing `this`.
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      '@typescript-eslint/unbound-method': 'error',
      '@typescript-eslint/no-array-delete': 'error',
      '@typescript-eslint/no-misused-spread': 'error',

      // A union switch that gains a member should fail loudly rather than fall
      // through silently. `considerDefaultExhaustiveForUnions` keeps switches that
      // already have a deliberate `default` from being flagged.
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],

      // --- judgment: each hit is either dead defensive code OR a lying type ---
      // `no-unnecessary-condition` is the rule that enforces "we control all the
      // code, so stop guarding against impossible states". When it fires, the fix
      // is either to delete the guard or to correct the type that claims a value
      // can never be null — both are wins, but only a human can tell which.
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // Unhandled rejections were the single largest source of production errors.
      // Fire-and-forget is fine, but it must be spelled `void promise` on purpose.
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',

      // Deprecated APIs are the landmines that detonate on the next SDK bump —
      // this is the cheapest early warning we get for them (runAfterInteractions,
      // runOnJS, appOwnership, MediaTypeOptions, blurOnSubmit all already fire).
      '@typescript-eslint/no-deprecated': 'warn',

      // `require-await` was evaluated 2026-08-02 and deliberately NOT enabled.
      // All 12 hits were async-by-contract, not dropped awaits: `loadModule`
      // satisfying the dynamic-import interface, expo's `handleNotification`
      // (must return Promise<NotificationBehavior>), and functions with an
      // explicit `: Promise<void>` return type. It flags interface conformance
      // here, so it would cost 12 permanent suppressions and catch nothing.

      // `${unknown}` silently renders "[object Object]" into user-facing strings
      // and Sentry titles.
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
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
      // Was 'off'. Stale closures from missing deps have already shipped real bugs
      // (the foreground due-words refresh). 'warn' so the existing hits surface
      // without blocking CI — suppress deliberate omissions per-line, don't re-disable.
      'react-hooks/exhaustive-deps': 'warn',
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
      'types/database.types.ts', // Supabase-generated; regenerated, never hand-edited
      '.github/',
      '__mocks__/',
      '__tests__/',
      '**/*.test.*',
      '**/*.spec.*',
      'translate/',
      'admin-dashboard/',
      'social/',
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
