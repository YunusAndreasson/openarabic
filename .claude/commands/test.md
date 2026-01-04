# Test

Run the test suite.

## Usage

```
/test [pattern]
```

## Commands

**Changed files only** (~2.2s):
```bash
yarn test
```

**All tests** (~7.7s):
```bash
yarn test:all
```

**Specific pattern:**
```bash
yarn test --testPathPattern=<pattern>
```

**Watch mode:**
```bash
yarn test:watch
```

**Coverage report:**
```bash
yarn test:coverage
```

## Behavior

1. If no pattern provided, run `yarn test` (changed files)
2. If pattern provided, run with `--testPathPattern`
3. Show test results
4. If tests fail, analyze failures and suggest fixes

## Notes

- Test timeout is 10 seconds for async operations
- Use Jest with React Native Testing Library
- Focus on specific tests related to your changes
