import { fixupPluginRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import reactPerf from 'eslint-plugin-react-perf';
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

const HERMES_V1_MISSING =
  'Missing from the Hermes v1 VM RN 0.88 ships — typechecks and passes jest, crashes on device;';

// Rules whose every hit needs a human call (the "backlog" rules below) are
// errors anyway: their existing hits are recorded per file and rule in
// eslint-suppressions.json (ESLint bulk suppressions). A NEW hit fails lint;
// fixing an old one makes lint fail until `eslint . --prune-suppressions`
// lowers the recorded count, so the backlog can only shrink. Never use
// `--suppress-all` to get a new hit through.
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
  //   mechanical — provably redundant, autofixable, no judgment needed.
  //   backlog    — real signal but each hit needs a human call, so the existing
  //                hits are bulk-suppressed (see the top of this file).
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
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

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
      // Backlog: bulk-suppressed.
      '@typescript-eslint/no-unnecessary-condition': 'error',

      // Unhandled rejections were the single largest source of production errors.
      // Fire-and-forget is fine, but it must be spelled `void promise` on purpose.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Deprecated APIs are the landmines that detonate on the next SDK bump —
      // this is the cheapest early warning we get for them (runAfterInteractions,
      // runOnJS, appOwnership, MediaTypeOptions and blurOnSubmit were all burned
      // down to zero before this became an error).
      '@typescript-eslint/no-deprecated': 'error',

      // `require-await` was evaluated 2026-08-02 and deliberately NOT enabled.
      // All 12 hits were async-by-contract, not dropped awaits: `loadModule`
      // satisfying the dynamic-import interface, expo's `handleNotification`
      // (must return Promise<NotificationBehavior>), and functions with an
      // explicit `: Promise<void>` return type. It flags interface conformance
      // here, so it would cost 12 permanent suppressions and catch nothing.

      // `${unknown}` silently renders "[object Object]" into user-facing strings
      // and Sentry titles.
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
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

  // React Compiler lints (eslint-plugin-react-hooks v7).
  //
  // v7 ships the React Compiler *as a linter*: beyond rules-of-hooks/exhaustive-deps
  // it statically proves the Rules of React — `purity`, `refs` (no ref reads/writes
  // during render), `immutability` (no mutating props/state), `set-state-in-effect`,
  // `set-state-in-render`, `static-components`, `error-boundaries`.
  //
  // IMPORTANT: `eslint-config-expo/flat.js` ALREADY enables 16 of this preset's 17
  // rules at the severities above (verified 2026-08-14 by reading its resolved rule
  // map — do not re-derive this by reading only this file, which is what made an
  // earlier audit wrongly conclude they were off). So this line is deliberately
  // near-redundant. It exists to:
  //   1. add the one rule expo omits — `void-use-memo`; and
  //   2. PIN the guarantee. These rules arrive transitively through an Expo preset,
  //      so an SDK bump could silently drop enforcement and nothing would fail. This
  //      line makes that a merge conflict instead of a silent regression.
  // All 17 measured at 0 violations repo-wide, so it changes no current output.
  //
  // Placed BEFORE the React block below so that block's deliberate
  // `exhaustive-deps` setting keeps winning over the preset's own one.
  reactHooks.configs.flat['recommended-latest'],

  // Performance checks, scoped to measured hot paths: each hit requires
  // profiling-backed judgment, and enabling them repo-wide would turn the
  // pre-existing chart and dictionary backlog into churn. Backlog: bulk-suppressed.
  {
    files: [
      // The global audio/miniplayer render path.
      'components/audio/{GlobalMiniPlayer,MiniPlayer}.{js,jsx,ts,tsx}',
      'hooks/audio/useGlobalAudioState.tsx',
      'hooks/audio/useShouldShowMiniPlayer.ts',
      // The Practice surfaces changed by the Practice optimization pass.
      'app/(tabs)/practice/index.tsx',
      'components/practice/charts/MemoryHorizonBand.tsx',
      'hooks/vocabulary/useMemoryInsights.ts',
      // The routing shell itself. Navigation layouts stay mounted for most of the
      // session, so an unstable option, header factory, or tab descriptor here
      // propagates through every screen transition.
      'app/_layout.tsx',
      'app/index.tsx',
      'app/(tabs)/**/_layout.tsx',
      'app/auth/_layout.tsx',
      'components/ui/CloseButton.tsx',
    ],
    plugins: {
      'react-native': fixupPluginRules(reactNative),
      'react-perf': fixupPluginRules(reactPerf),
    },
    rules: {
      'react-perf/jsx-no-new-object-as-prop': 'error',
      'react-perf/jsx-no-new-array-as-prop': 'error',
      'react-perf/jsx-no-new-function-as-prop': 'error',
      'react-perf/jsx-no-jsx-as-prop': 'error',
      'react/jsx-no-bind': 'error',
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-unstable-nested-components': 'error',
      'react/no-object-type-as-default-prop': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-unused-styles': 'error',
      'react-native/no-color-literals': 'error',
      'react-native/no-single-element-style-arrays': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  // The rules that actually add signal: NOT in the preset and NOT in expo's config,
  // and unlike everything above these have real hits. Same treatment as the
  // type-aware backlog: each needs a human call per site, so the existing hits are
  // bulk-suppressed and only a new one fails.
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Incomplete/extra dep arrays stop the compiler from tracking data flow, and
      // the "missing" half is a stale-closure bug waiting to happen.
      'react-hooks/memo-dependencies': 'error',
      // A capitalized call that isn't a component is either a mis-named helper or a
      // component being invoked as a function (which silently drops its state). Both
      // need reading the call site to tell apart.
      'react-hooks/capitalized-calls': 'error',
    },
  },

  // The component layering, enforced rather than documented.
  //
  //   components/primitives  — ThemedText/View/Button/Input. No barrel: they are
  //                            imported by BOTH ui and common, so they must sit
  //                            below both and cannot participate in a cycle.
  //   components/ui          — interactive controls and form primitives (barrel)
  //   components/common      — layout, state and composition primitives (barrel)
  //   feature directories    — everything else, free to use any barrel
  //
  // Inside ui | common | providers | primitives, a sibling must be imported by
  // direct path. Going through a barrel pulls in every other member and closes a
  // cycle — `ui/index` → `SettingsPicker` → `common/index` → `EmptyState` →
  // `ui/index`. A cycle resolves to `undefined` at module-init time, so the
  // failure is a blank component at runtime, not a build error. This rule turns
  // the next one into a lint failure instead. Currently zero violations.
  {
    files: [
      'components/ui/**/*.{ts,tsx}',
      'components/common/**/*.{ts,tsx}',
      'components/providers/**/*.{ts,tsx}',
      'components/primitives/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/ui',
              message:
                'Import the sibling directly (e.g. @/components/ui/IconButton). Barrel imports between ui/common/providers close an import cycle that resolves to undefined at runtime.',
            },
            {
              name: '@/components/common',
              message:
                'Import the sibling directly (e.g. @/components/common/EmptyState). Barrel imports between ui/common/providers close an import cycle that resolves to undefined at runtime.',
            },
            {
              name: '@/components/providers',
              message:
                'Import the provider directly (e.g. @/components/providers/ToastProvider). Barrel imports between ui/common/providers close an import cycle that resolves to undefined at runtime.',
            },
          ],
        },
      ],
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
      // (the foreground due-words refresh). Backlog: bulk-suppressed — suppress a
      // deliberate omission per-line, don't re-disable.
      'react-hooks/exhaustive-deps': 'error',
      'react/no-unescaped-entities': 'off',
      'import/no-duplicates': 'error', // Consolidate imports for easier refactoring
      'import/first': 'off', // Type imports after regular imports allowed
    },
  },

  // Hermes v1 guard. TypeScript's ESNext lib types these and jest runs them on
  // Node, so a call passes both and then throws on device — `toSorted` already
  // shipped that way once. App source only: scripts and tests run on Node.
  // Deliberately absent because Hermes v1 has them: Object.groupBy, the ES2025 Set
  // methods, String#isWellFormed — and structuredClone, which Expo's winter
  // runtime polyfills (expo/src/winter/runtime.native.ts).
  {
    files: ['{app,components,hooks,services,store,constants,utils,lib}/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        // No `object`, so it matches every receiver, `a?.toSorted()` and
        // `const { toSorted } = a` included.
        { property: 'toSorted', message: `${HERMES_V1_MISSING} use [...array].sort().` },
        {
          object: 'Array',
          property: 'fromAsync',
          message: `${HERMES_V1_MISSING} use Promise.all() or a for await...of loop.`,
        },
        {
          object: 'Map',
          property: 'groupBy',
          message: `${HERMES_V1_MISSING} build the Map in a loop (Object.groupBy is fine).`,
        },
        {
          object: 'Promise',
          property: 'try',
          message: `${HERMES_V1_MISSING} use new Promise(resolve => resolve(fn())).`,
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'DisposableStack', message: `${HERMES_V1_MISSING} use try/finally.` },
        { name: 'AsyncDisposableStack', message: `${HERMES_V1_MISSING} use try/finally.` },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "VariableDeclaration[kind='using']",
          message: `\`using\`: ${HERMES_V1_MISSING} use try/finally.`,
        },
        {
          selector: "VariableDeclaration[kind='await using']",
          message: `\`await using\`: ${HERMES_V1_MISSING} use try/finally.`,
        },
      ],
    },
  },

  globalIgnores([
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
    // Separate projects with their own tooling (see AGENTS.md)
    'translate/',
    'admin-dashboard/',
    'social/',
    'publish/',
    'brand/',
    'store-listing/',
    // Agent config, plus the per-agent checkouts under .claude/worktrees
    '.claude/',
    'scripts/',
    'coverage/',
    'jest.setup.js',
    'jest.config.js',
    'jest.polyfills.js',
  ]),

  // Prettier must be last
  prettierConfig,
]);
