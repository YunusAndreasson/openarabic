# Testing & Validation

## Command Execution Workflow

**CRITICAL: NEVER run validation during development** - Make all changes first, then validate once at the very end.

### Anti-pattern (DO NOT DO):

```
❌ Make edit → run tsc → run eslint → make another edit → run tsc again
```

### Correct pattern:

```
✅ Make edit 1 → Make edit 2 → Make edit 3 → (user confirms done) → yarn validate once
```

## Validation Commands

| Command              | Purpose                                     | When to Use                |
| -------------------- | ------------------------------------------- | -------------------------- |
| `yarn validate`      | Fast validation (changed files only, ~5-6s) | End of development session |
| `yarn validate:full` | Full validation (all files)                 | Before commits/PRs         |
| `yarn prettier:fix`  | Auto-format all files                       | When prettier check fails  |
| `yarn lint:fix`      | Linting with auto-fix                       | Only at end                |

## Test Commands

| Command              | Purpose                    | Time  |
| -------------------- | -------------------------- | ----- |
| `yarn test`          | Run tests on changed files | ~2.2s |
| `yarn test:all`      | Run all tests              | ~7.7s |
| `yarn test:watch`    | Watch mode for development | -     |
| `yarn test:coverage` | Generate coverage report   | -     |

## Performance Optimization

The validation workflow has been optimized for AI agent efficiency:

- `yarn validate` uses smart script (`scripts/validate-changed.js`)
- **TypeScript**: Only changed .ts/.tsx files (via tsc-files) - ~0.4s
- **Prettier/ESLint**: All files with aggressive caching - ~3.4s and ~1.7s
- **Parallel execution**: All three tools run simultaneously
- **80% faster**: Reduced from 28.29s → 5.66s for typical changes

## Development Workflow

During development:

- Focus on specific tests related to your changes
- Test only what's necessary to validate fixes
- Use Jest with React Native Testing Library
- Test timeout: 15 seconds, set once in `jest.config.js` (`testTimeout`, with `maxWorkers: '75%'`); the scripts pass neither

## Test Harness

Suites live in `__tests__/` as `*.test.ts(x)`; jest collects nothing else.

- **`resetMocks: true`** wipes every `jest.fn()` implementation before each
  test, including the ones in a `jest.mock` factory. A shared mock that must
  keep its behaviour is made with `mockStable(impl)`, a global defined in
  jest.setup.js and used there and in `__mocks__/*`: the implementation is
  re-applied after the reset, and a test can still override it for that test.
  A suite's own factory `jest.fn(impl)` is gone by the time the test runs, so
  arm it in `beforeEach`.
- **react-native** is the jest.setup.js mock. `StyleSheet.flatten` is the real
  merge, so assert on `StyleSheet.flatten(node.props.style)` instead of
  hand-merging style arrays.
- **Redux**: under a `<Provider>` (a store from `setupTestStore`, or
  `createHookTestWrapper({ withRedux: true })`) the real react-redux runs
  against that store. Without one, the hooks read the fixed state in
  `__mocks__/react-redux.js`.
- **React Query** is the real library. Render through
  `createHookTestWrapper()` (`__tests__/helpers/hookMocks.tsx`): a fresh
  client per call, retries off, no garbage collection.
- **Clock**: Jest's fake timers, starting at 2024-01-15T12:00Z and advancing
  with real time, so `jest.setSystemTime` works. Importing
  `@testing-library/react-native` re-installs them with Jest's defaults
  (real current time, no auto-advance); see jest.setup.js.

## End of Session (REQUIRED)

Always run these commands before completing longer sessions:

1. `yarn validate` - Fast validation (only changed files)
2. `yarn validate:full` - Full validation (use before commits/PRs)
3. Only run validation at the very end

## Key Principles

- **Execute directly** - Run commands without asking permission
- **Show only errors** - If a command fails, show the error and fix it
- **Verify once** - Re-run only to confirm the fix worked
- **No verbose explanations** - Don't explain what commands do
