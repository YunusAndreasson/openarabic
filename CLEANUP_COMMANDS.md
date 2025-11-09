# Cleanup Commands - Quick Reference

> Quick reference for common cleanup commands and search patterns.
> Use alongside `CLEANUP_ROADMAP.md`.

---

## 🔍 Finding Unused Code

### Find Unused Exports

```bash
# Run knip to find unused exports
yarn check-unused

# Alternative: Find all exports
rg "^export (const|function|class|interface|type)" -t ts -t tsx

# Count usages of a specific export
rg "exportName" --count --sort path
```

### Find Unused Imports

```bash
# ESLint will catch these automatically
yarn lint

# Manual check: find imports
rg "^import.*from" -t ts -t tsx | head -50
```

### Find Unused Constants

```bash
# List all constants in a file
rg "^export const [A-Z_]+" constants/

# Check usage of specific constant
rg "CONSTANT_NAME" --count

# Find constants with zero usages
for const in $(rg "^export const ([A-Z_]+)" constants/strings.ts -or '$1'); do
  count=$(rg "$const" --count | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "Unused: $const"
  fi
done
```

### Find Unused Types/Interfaces

```bash
# List all type exports
rg "^export (type|interface) " types/ -t ts

# Check type usage
rg "TypeName" --count

# Find types imported but never used
rg "import type \{.*\}" -t ts -t tsx
```

### Find Unused Components

```bash
# List all component files
find components -name "*.tsx" -type f

# Check component imports
rg "from '@/components" --count --sort path

# Find components never imported
# (Manual inspection needed - look for 0 count imports)
```

---

## 🗑️ Finding Dead Code

### Commented Code

```bash
# Find commented JSX
rg "\{/\*.*\*/\}" -t tsx

# Find commented lines
rg "^[ \t]*//" -t ts -t tsx | head -100

# Find multi-line comments
rg "/\*[\s\S]*?\*/" -U -t ts -t tsx
```

### TODO/FIXME/HACK

```bash
# Find all TODO comments
rg "TODO|FIXME|HACK|TEMP|XXX" -t ts -t tsx

# Count by type
rg "TODO" -t ts -t tsx --count
rg "FIXME" -t ts -t tsx --count
rg "HACK" -t ts -t tsx --count
```

### Debug Code

```bash
# Find console statements
rg "console\.(log|debug|warn|error)" -t ts -t tsx

# Find debugger statements
rg "debugger;" -t ts -t tsx

# Find development-only code
rg "__DEV__" -t ts -t tsx
```

### Unreachable Code

```bash
# Find code after return (TypeScript will catch this)
npx tsc --noUnusedLocals --noUnusedParameters --noEmit

# Manual pattern search
rg "return.*;.*\n.*[^}]" -U -t ts -t tsx
```

---

## 📊 Analyzing Props & Defaults

### Find Optional Props

```bash
# Find all optional props in interfaces
rg "^\s+\w+\?:" -t ts -t tsx

# Find props with default values
rg "= \{[^}]*\}" -t tsx
```

### Check Prop Usage

```bash
# For a specific component, find all usages
rg "<ComponentName" -t tsx -A 5

# Check if optional prop is ever passed
rg "<ComponentName.*propName=" -t tsx
```

### Find Props Always Same Value

```bash
# Example: Search for variant="default"
rg 'variant="default"' -t tsx --count

# Then search for variant with other values
rg 'variant="(primary|secondary)"' -t tsx --count

# If second count is 0, variant prop is always default
```

---

## 📈 Measuring Impact

### Count Lines of Code

```bash
# Total lines
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l

# By directory
find components -name "*.tsx" | xargs wc -l | tail -1
find hooks -name "*.ts" | xargs wc -l | tail -1
find utils -name "*.ts" | xargs wc -l | tail -1
```

### Count Files

```bash
# Total TypeScript files
find . -name "*.ts" -o -name "*.tsx" | wc -l

# By directory
find components -name "*.tsx" | wc -l
find hooks -name "*.ts" | wc -l
```

### Bundle Size

```bash
# Create production bundle
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/bundle.js

# Check size
ls -lh /tmp/bundle.js

# Compare before/after
ls -lh /tmp/bundle-before.js /tmp/bundle-after.js
```

### TypeScript Compile Time

```bash
# Time compilation
time npx tsc --noEmit
```

---

## 🔧 Specific Cleanup Patterns

### Remove Unused Hook Returns

```bash
# Find hook destructuring
rg "const \{.*\} = use\w+" -t tsx

# Check each destructured variable usage
# Example: const { a, b, c } = useHook()
# Search for each of a, b, c in the file
```

### Find Duplicate Component Logic

```bash
# Search for similar component names
rg "export.*function.*Button" components/ -t tsx

# Search for similar prop patterns
rg "interface.*Props" components/ -t ts -t tsx
```

### Find Unused Service Methods

```bash
# List service exports
rg "^export (async )?function" services/ -t ts

# Check usage of each
for func in getArticles getArticleById updateArticle; do
  echo "=== $func ==="
  rg "$func" --count
done
```

### Find Unused Utility Functions

```bash
# List utils exports
rg "^export (const|function)" utils/ -t ts

# Check usage
rg "from '@/utils" -t ts -t tsx
```

---

## 🎯 Targeted Searches

### Find All Usages of a Symbol

```bash
# Find all usages in code
rg "SYMBOL_NAME" --type-add 'source:*.{ts,tsx}' -t source

# Show file and line
rg "SYMBOL_NAME" -t ts -t tsx -n

# Show context (5 lines before/after)
rg "SYMBOL_NAME" -t ts -t tsx -C 5
```

### Find Import Sources

```bash
# Find where something is imported from
rg "from ['\"].*SYMBOL_NAME" -t ts -t tsx

# Find barrel exports
rg "export.*from" -t ts
```

### Find Re-exports

```bash
# Find barrel export files
find . -name "index.ts" -o -name "index.tsx"

# Check what they export
rg "export.*from" components/index.ts
```

---

## 🧪 Validation After Cleanup

### Run Tests

```bash
# All tests
yarn test:all

# Specific test file
yarn test path/to/test.test.ts

# With coverage
yarn test:coverage
```

### Type Check

```bash
# Full type check
npx tsc --noEmit

# With strict flags
npx tsc --noUnusedLocals --noUnusedParameters --noEmit
```

### Lint

```bash
# Full lint
yarn lint

# Auto-fix
yarn lint:fix

# Specific file
npx eslint path/to/file.ts
```

### Check Unused Exports

```bash
# Run knip
yarn check-unused

# With configuration
npx knip --config knip.json
```

### Build Check

```bash
# Development build
yarn start

# Production build (EAS)
eas build --platform ios --profile preview --local
```

---

## 📝 Safe Removal Workflow

### Before Removing Anything

```bash
# 1. Search for usages
rg "ITEM_NAME" --count

# 2. Check imports
rg "import.*ITEM_NAME" -t ts -t tsx

# 3. Run tests
yarn test

# 4. Check TypeScript
npx tsc --noEmit
```

### After Removal

```bash
# 1. Run validation
yarn validate

# 2. Run tests
yarn test:all

# 3. Check build
yarn start

# 4. Commit with descriptive message
git add -A
git commit -m "chore: remove unused ITEM_NAME

- Verified 0 usages across codebase
- All tests passing
- TypeScript compilation successful
"
```

---

## 🔄 Batch Operations

### Remove All Unused Imports (ESLint)

```bash
# Auto-fix unused imports
yarn lint:fix

# Or manually
npx eslint --fix "**/*.{ts,tsx}"
```

### Format All Files

```bash
# Prettier fix
yarn prettier:fix

# Or manually
npx prettier --write "**/*.{ts,tsx}"
```

### Update All Imports After Removal

```bash
# TypeScript will show errors for broken imports
npx tsc --noEmit

# Fix each broken import manually or with IDE
```

---

## 📊 Reporting

### Generate Removal Report

```bash
# Count before cleanup
echo "Before:" > cleanup-report.txt
find . -name "*.ts" -o -name "*.tsx" | wc -l >> cleanup-report.txt
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 >> cleanup-report.txt

# After cleanup, append
echo "After:" >> cleanup-report.txt
find . -name "*.ts" -o -name "*.tsx" | wc -l >> cleanup-report.txt
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 >> cleanup-report.txt
```

### List All Commits

```bash
# Show cleanup commits
git log --oneline --grep="chore: remove"

# Show files changed
git log --stat --grep="chore: remove"
```

---

## 🚨 Emergency Rollback

### If Something Breaks

```bash
# Revert last commit
git revert HEAD

# Restore specific file
git restore path/to/file.ts

# Restore from specific commit
git restore --source=COMMIT_HASH path/to/file.ts

# Reset to before cleanup (DANGEROUS)
git reset --hard COMMIT_HASH
```

---

**Last Updated**: 2025-01-08
**See Also**: `CLEANUP_ROADMAP.md`, `CLEANUP_FINDINGS.md`
