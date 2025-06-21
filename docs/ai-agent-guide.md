# AI Agent Development Guide

## Overview

This guide provides AI coding agents with specific patterns, templates, and workflows optimized for reliable code generation in the OpenArabic React Native app.

## Quick Start for AI Agents

### 1. Pre-Implementation Checklist

```bash
# Always run before starting any task
yarn validate  # Check types, linting, dependencies
yarn test      # Ensure all tests pass
```

### 2. Essential File Patterns

- **Components**: Always start by checking `components/index.ts` for existing similar components
- **Hooks**: Check `hooks/index.ts` and relevant subdirectories
- **Types**: Import from `types/` directory, never create inline types
- **Constants**: Use values from `constants/` - never hardcode strings, colors, or dimensions

## AI-Optimized Development Patterns

### Component Creation Template

```typescript
import React from 'react';
import type { ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { ComponentNameProps } from '@/types/ui/component.types';

export const ComponentName = React.memo<ComponentNameProps>(
  (
    {
      // Props destructuring
    }
  ) => {
    // Static styles (performance optimization)
    const styles = React.useMemo(
      () => ({
        container: {
          padding: LAYOUT.SPACING.MEDIUM,
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
        } as ViewStyle,
      }),
      []
    );

    return (
      <ThemedView style={styles.container}>
        <ThemedText>{STRINGS.COMPONENT_TITLE}</ThemedText>
      </ThemedView>
    );
  }
);

ComponentName.displayName = 'ComponentName';
```

### Hook Creation Template

```typescript
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { handleError } from '@/utils/errorHandling';
import type { HookReturnType } from '@/types/hooks.types';

export const useHookName = (): HookReturnType => {
  const [state, setState] = useState<StateType>(initialState);
  const queryClient = useQueryClient();

  // Query with proper error handling
  const { data, isLoading, error } = useQuery({
    queryKey: FSRS_QUERY_KEYS.HOOK_DATA,
    queryFn: async () => {
      try {
        return await serviceFunction();
      } catch (error) {
        handleError(error, { context: 'useHookName' });
        throw error;
      }
    },
  });

  // Memoized callbacks for performance
  const handleAction = useCallback((param: ParamType) => {
    // Implementation
  }, []);

  // Memoized return object
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      handleAction,
    }),
    [data, isLoading, error, handleAction]
  );
};
```

### Test Creation Template

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { useHookName } from '@/hooks/useHookName';

// Mock dependencies
jest.mock('@/services/service', () => ({
  serviceFunction: jest.fn(),
}));

const createWrapper = () => {
  // Provider setup if needed
  return ({ children }: { children: React.ReactNode }) => children;
};

describe('useHookName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useHookName(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle actions correctly', async () => {
    const { result } = renderHook(() => useHookName());

    await act(async () => {
      await result.current.handleAction('test');
    });

    expect(result.current.data).toBeDefined();
  });
});
```

## AI Decision Trees

### When to Create vs Reuse

```
Need a component?
├── Check components/index.ts
├── Search for similar patterns: `grep -r "similar-pattern" components/`
├── If exists: Extend existing component
└── If not: Create new with template above

Need a hook?
├── Check hooks/index.ts and subdirectories
├── Look for similar business logic
├── If exists: Extend or compose existing hooks
└── If not: Create new with template above

Need types?
├── Check types/ directory first
├── Look for similar interfaces
├── If exists: Extend existing types
└── If not: Add to appropriate types file
```

### Performance Optimization Decision Tree

```
Component renders >50ms?
├── Apply React.memo with custom comparison
├── Extract static constants outside component
├── Memoize expensive calculations with useMemo
├── Cache style objects
└── Use useCallback for event handlers

Hook causes re-renders?
├── Memoize return object with useMemo
├── Use useCallback for functions
├── Split complex hooks into smaller ones
└── Optimize dependencies arrays
```

## AI-Specific Code Quality Checks

### Before Submitting Code

1. **Type Safety**: No `any` types, handle null/undefined explicitly
2. **Constants Usage**: No hardcoded strings, colors, or dimensions
3. **Error Handling**: All async operations wrapped in try/catch with handleError
4. **Performance**: Memoization applied where appropriate
5. **Testing**: Tests created for new hooks and complex components
6. **Accessibility**: Proper touch targets and semantic elements

### Common AI Pitfalls to Avoid

1. **Navigation**: Always use full paths `/(tabs)/read/article/[id]` not `/article/[id]`
2. **Query Keys**: Use FSRS_QUERY_KEYS constants, not hardcoded strings
3. **Haptic Feedback**: Check for double feedback from parent/child components
4. **Imports**: Use `import type` for type-only imports
5. **Unused Variables**: Prefix with `_` if intentionally unused

## Automated Validation Commands

```bash
# Quick validation (AI agents should run before each commit)
yarn validate

# Full validation with tests and coverage
yarn ci

# Performance testing (when environment stable)
yarn reassure --baseline
yarn reassure

# Dependency analysis
yarn knip:ci
```

## AI Workflow Optimization

### Parallel Development Pattern

```bash
# AI agents can run these simultaneously for faster development
yarn typecheck &    # Type checking
yarn lint:fix &      # Linting with auto-fix
yarn test:watch &    # Test watching
wait                 # Wait for all to complete
```

### Error Recovery Pattern

```bash
# When tests fail
yarn test --verbose  # Get detailed error information
# Fix issues based on error output
yarn validate        # Ensure fixes don't break other rules
```

## Integration with AI Tools

### Cursor/AI Assistant Integration

- **Context Files**: Always reference `constants/`, `types/`, and `docs/` for context
- **Pattern Recognition**: Use existing patterns in `components/` and `hooks/`
- **Validation**: Run `yarn validate` after each significant change

### Code Generation Guidelines

1. **Start with templates** provided above
2. **Reference existing similar code** in the same domain
3. **Apply performance optimizations** from the start
4. **Include comprehensive tests** with each component/hook
5. **Follow the decision trees** for consistency

## Success Metrics for AI Agents

### Code Quality Indicators

- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ✅ All tests pass
- ✅ No unused dependencies (knip clean)
- ✅ Performance optimizations applied

### Development Efficiency Indicators

- ✅ Reused existing patterns instead of creating new ones
- ✅ Used constants instead of hardcoded values
- ✅ Applied proper error handling
- ✅ Created comprehensive tests
- ✅ Followed established architectural patterns

This guide ensures AI agents can work efficiently while maintaining code quality and following established patterns.
