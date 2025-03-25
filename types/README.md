# Types Directory Structure

This directory contains TypeScript type definitions for the application.

## Organization

The types are organized into the following structure:

```
types/
├── ui/                        # UI-related types
│   ├── base.types.ts          # Base interfaces (BaseStyleProps, BaseAnimatedStyleProps, etc.)
│   ├── button.types.ts        # Button-related interfaces
│   ├── card.types.ts          # Card-related interfaces
│   ├── article.types.ts       # Article UI-related interfaces
│   ├── form.types.ts          # Form-related interfaces
│   ├── image.types.ts         # Image-related interfaces
│   ├── layout.types.ts        # Layout-related interfaces
│   ├── loader.types.ts        # Loader-related interfaces
│   ├── modal.types.ts         # Modal-related interfaces
│   ├── pill.types.ts          # Pill-related interfaces
│   ├── text.types.ts          # Text-related interfaces
│   └── index.ts               # Re-exports all UI types
├── articles.types.ts          # Article-related types
├── database.types.ts          # Database schema types
└── vocabulary.types.ts        # Vocabulary-related types
```

## Usage

### Recommended Approach

Import directly from the specific category:

```typescript
import { ThemedCardProps } from '@/types/ui/card.types';
import { ThemedButtonProps } from '@/types/ui/button.types';
```

Or import from the UI index file:

```typescript
import { ThemedCardProps, ThemedButtonProps } from '@/types/ui';
```

## Organization Benefits

- **Improved maintainability**: Smaller files are easier to maintain and debug
- **Better organization**: Related types are grouped together
- **Enhanced discoverability**: Easier to find specific types
- **Reduced merge conflicts**: Smaller files minimize git conflicts in collaborative development
- **Faster loading**: Better code-splitting with more granular imports
- **Better type cohesion**: Types that work together are defined together

## Animation Type Handling

For components with animated styles, use the `AnimatedStyleProp<T>` type:

```typescript
import { AnimatedStyleProp } from '@/types/ui/base.types';

// When working with animated styles
const animatedContainer = [styles.container, animatedValues.style] as AnimatedStyleProp<ViewStyle>;
```

This helper type properly handles the complex type scenarios when working with React Native Reanimated.
