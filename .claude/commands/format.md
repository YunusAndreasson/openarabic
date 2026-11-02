# Format

Auto-format all files using Prettier.

## Usage

```
/format
```

## Command

```bash
yarn prettier:fix
```

## Behavior

1. Run prettier with the fix flag
2. All files will be automatically formatted
3. Report success when complete

## Notes

- Use this when the prettier check fails. Prettier owns formatting, so don't fix formatting by hand.
