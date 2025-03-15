# TypeScript Type Definitions

This directory contains all centralized type definitions for the application. Following these guidelines ensures consistency across the codebase and makes it easier to maintain and evolve the type system.

## Directory Structure

- `articles.types.ts` - Types related to articles and content
- `database.types.ts` - Database schema and related types
- `ui.types.ts` - UI component prop types
- `vocabulary.types.ts` - Types for vocabulary and language learning features

## Guidelines for Type Definitions

### 1. Centralized Type Definitions

Always define component prop types and other shared types in the appropriate `*.types.ts` file rather than inline in component files. This ensures:

- Types are consistent across the application
- Types are easily discoverable
- Changes to types can be made in one place

### 2. Importing Types

When using types from the types directory, use named imports:

```tsx
// CORRECT
import { ThemedButtonProps } from '@/types/ui.types';

// AVOID
import * as UITypes from '@/types/ui.types';
```

### 3. Naming Conventions

- Component prop types should be named `ComponentNameProps`
- Interfaces are preferred over type aliases for object types
- Use PascalCase for type names and interfaces
- Use camelCase for type properties

### 4. Type Documentation

Always include JSDoc comments for types to document:

- The purpose of the type
- Details about specific properties
- Constraints or expectations for values

Example:

```tsx
/**
 * Props for ThemedText component
 */
export type ThemedTextProps = TextProps & {
  /** The type of text to display */
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'arabic';
  /** Whether to skip applying the default text color */
  skipDefaultColor?: boolean;
  /** Font size for Arabic text */
  arabicFontSize?: number;
};
```

### 5. Animation Types

For components that use Reanimated animations, make sure the type definitions properly accommodate both regular styles and animated styles:

```tsx
style?: StyleProp<ViewStyle> | StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
```

### 6. Type Organization

- Group related types together in the same file
- Place shared utility types in the most appropriate file or create a new file if needed
- Keep type files focused on a specific domain or feature area

### 7. Type Extensions

When extending React Native types (like TextProps or ViewProps), use the following pattern:

```tsx
export interface ComponentProps extends Omit<BaseProps, 'conflictingProp'> {
  // New or overridden props
  conflictingProp?: NewType;
}
```

## Adding New Types

1. Identify which type file is most appropriate (ui, articles, vocabulary, etc.)
2. Add the new type with proper JSDoc documentation
3. Use consistent naming and structure
4. Import from the types directory in your components

## Migrating Inline Types

When encountering inline types in components:

1. Move the type to the appropriate type file
2. Add proper JSDoc documentation if missing
3. Update the component to import the type
4. Make sure any animations or special style handling is properly typed
