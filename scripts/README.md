# Scripts Directory

This directory contains utility scripts for development and maintenance tasks.

## Available Scripts

### UI Types Migration Script

The `migrate-ui-types.js` script helps migrate component imports from the monolithic `ui.types.ts` file to the new modular structure in `types/ui/`.

#### Usage

Run the script from the project root:

```bash
node scripts/migrate-ui-types.js
```

#### What it does

1. Finds all TypeScript files in the `components` directory
2. Identifies imports from `@/types/ui.types`
3. Maps each imported type to its appropriate category file
4. Updates import statements to use the new file paths
5. Preserves type aliases and other import syntax

#### Example

Before:

```typescript
import { ThemedCardProps, ThemedButtonProps } from '@/types/ui.types';
```

After:

```typescript
import { ThemedCardProps } from '@/types/ui/card.types';
import { ThemedButtonProps } from '@/types/ui/button.types';
```

#### Benefits

- Ensures consistent import paths across the codebase
- Automates the tedious migration process
- Reduces the chance of manual errors

#### Notes

- Run this script only after all the type files have been properly created and organized
- The script is safe to run multiple times (idempotent)
- After running, verify the changes and fix any issues that may arise
