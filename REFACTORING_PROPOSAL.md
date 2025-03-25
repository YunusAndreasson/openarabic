# UI Types Refactoring Proposal

## Current Issues

1. The `ui.types.ts` file is too large (1369 lines) making it difficult to navigate and maintain
2. There are linter errors with some types due to incorrect inheritance
3. Related types are scattered throughout the file rather than grouped together
4. Some types have similar functionality but are defined separately

## Proposed Solution

Split the current monolithic `ui.types.ts` file into logical modules based on component categories:

### 1. Create a types directory structure

```
types/
├── ui/
│   ├── base.types.ts        # Base interfaces (BaseStyleProps, BaseAnimatedStyleProps, etc.)
│   ├── card.types.ts        # Card-related interfaces (BaseCardProps, ThemedCardProps, etc.)
│   ├── button.types.ts      # Button-related interfaces (BaseButtonProps, etc.)
│   ├── text.types.ts        # Text-related interfaces (ThemedTextProps, etc.)
│   ├── layout.types.ts      # Layout-related interfaces (ThemedViewProps, etc.)
│   ├── pill.types.ts        # Pill-related interfaces (BasePillProps, FilterPillProps, etc.)
│   ├── loader.types.ts      # Loader-related interfaces (LoaderProps, LoadingContainerProps, etc.)
│   ├── form.types.ts        # Form-related interfaces (ThemedInputProps, etc.)
│   ├── modal.types.ts       # Modal-related interfaces (ThemedModalProps, etc.)
│   ├── article.types.ts     # Article-specific UI interfaces
│   ├── vocabulary.types.ts  # Vocabulary-specific UI interfaces
│   └── index.ts             # Export all UI types
└── index.ts                 # Re-export from subdirectories
```

### 2. Base interfaces (base.types.ts)

```typescript
// Extract all base interfaces to a separate file for reuse
export interface BaseStyleProps { ... }
export interface BaseAnimatedStyleProps { ... }
export interface BaseThemedProps { ... }
export interface BasePressableProps { ... }
export interface BaseOptionalPressableProps { ... }
export interface BaseChildrenProps { ... }
export interface BaseAnimationProps { ... }
```

### 3. Index file with re-exports

```typescript
// types/ui/index.ts
export * from './base.types';
export * from './card.types';
export * from './button.types';
// etc.
```

### 4. Refactor imports in components

Update import statements in components to use the new module structure:

```typescript
// Before
import { ThemedCardProps } from '@/types/ui.types';

// After
import { ThemedCardProps } from '@/types/ui/card.types';
// or
import { ThemedCardProps } from '@/types/ui';
```

## Benefits

1. **Improved maintainability**: Smaller files are easier to maintain and debug
2. **Better organization**: Related types are grouped together
3. **Enhanced discoverability**: Easier to find specific types
4. **Reduced merge conflicts**: Smaller files minimize git conflicts when multiple developers work on the codebase
5. **Faster loading**: Potentially better code-splitting with more granular imports
6. **Better type cohesion**: Types that work together are defined together

## Implementation Strategy

1. Create the new directory structure
2. Move types to appropriate files
3. Create index.ts with re-exports
4. Update imports in components (can be done gradually)
5. Once all imports are updated, remove the original ui.types.ts file

This refactoring should be done as a separate PR and thoroughly tested to ensure no regressions.
