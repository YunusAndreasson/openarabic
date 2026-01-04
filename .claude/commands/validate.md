# Validate

Run the validation suite to check for TypeScript errors, linting issues, and formatting problems.

## Usage

```
/validate [full]
```

## Commands

**Fast validation** (changed files only, ~5-6s):
```bash
yarn validate
```

**Full validation** (all files, before commits/PRs):
```bash
yarn validate:full
```

## Behavior

1. Run the appropriate validation command based on argument
2. If validation passes, report success
3. If validation fails:
   - Show only the error output
   - Fix the issues
   - Re-run validation to confirm

## Notes

- Never run validation during development - only at the end
- If prettier fails, use `yarn prettier:fix` to auto-format
- Never manually fix formatting issues
