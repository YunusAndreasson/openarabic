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
- Test timeout: 10 seconds for async operations

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
