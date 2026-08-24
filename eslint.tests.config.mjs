import { defineConfig } from 'eslint/config';
import testingLibrary from 'eslint-plugin-testing-library';
import { parser as tsParser } from 'typescript-eslint';

// Separate from eslint.config.mjs on purpose: that file's global `ignores`
// block excludes __tests__/**/*.test.* entirely (an `ignores`-only entry is a
// global exclusion in flat config — no later `files` block can un-ignore it),
// and removing the exclusion there would also drop every app-only rule block
// (type-aware TS rules, React Compiler purity, exhaustive-deps, the
// ui/common/providers layering guard) onto 248 test files with no measurement
// of what that would surface. This file's blast radius is exactly
// eslint-plugin-testing-library, on test files only — which is also why lint
// never caught the six false-pass tests fixed in 87c8e51b.
export default defineConfig([
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'testing-library': testingLibrary,
    },
    rules: {
      // --- measured at zero repo-wide on 2026-08-24 (18 of 22 recommended
      // rules), so these are enforced immediately at zero fix cost. Each
      // catches a real RNTL bug shape: an un-awaited async query/util racing
      // the assertion after it, a `waitFor` doing more than one job (so it can
      // pass on the wrong assertion), cleanup/lifecycle ordering, a Promise
      // handed to `fireEvent` instead of awaited. ---
      'testing-library/await-async-events': ['error', { eventModule: 'userEvent' }],
      'testing-library/await-async-queries': 'error',
      'testing-library/await-async-utils': 'error',
      'testing-library/no-await-sync-events': ['error', { eventModules: ['fire-event'] }],
      'testing-library/no-await-sync-queries': 'error',
      'testing-library/no-container': 'error',
      'testing-library/no-debugging-utils': 'error',
      'testing-library/no-dom-import': ['error', 'react'],
      'testing-library/no-global-regexp-flag-in-query': 'error',
      'testing-library/no-manual-cleanup': 'error',
      'testing-library/no-node-access': 'error',
      'testing-library/no-promise-in-fire-event': 'error',
      'testing-library/no-render-in-lifecycle': 'error',
      'testing-library/no-wait-for-multiple-assertions': 'error',
      'testing-library/no-wait-for-side-effects': 'error',
      'testing-library/no-wait-for-snapshot': 'error',
      'testing-library/prefer-find-by': 'error',
      'testing-library/prefer-query-by-disappearance': 'error',

      // --- backlog: real hits measured 2026-08-24, not fixed in this pass ---
      // 6   testing-library/no-unnecessary-act
      // 12  testing-library/prefer-presence-queries
      // 21  testing-library/render-result-naming-convention
      // 501 testing-library/prefer-screen-queries — `const { getByText } =
      //     render(...)` throughout instead of `render(...)` + `screen.getByText`;
      //     a real repo-wide style backlog, not a per-site bug, so a bulk fix
      //     needs its own pass rather than riding in here.
    },
  },
]);
