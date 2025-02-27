# Loader Component Usage Guidelines

This document outlines the standardized approach for using loading indicators throughout the application.

## Available Components

We have three loader components available for different use cases:

1. `Loader` - The base loader component
2. `LoadingScreen` - A full-screen loader with ThemedView integration
3. `LoadingContainer` - A component-level loader container

## When to Use Each Component

### Loader

The base `Loader` component should be used:

- When you need a custom loader implementation
- When you need to place the loader in a specific position within a layout
- When you need precise control over the loader's appearance

```tsx
import { Loader } from '@/components/Loader';

// Basic usage
<Loader size="large" />

// With custom color
<Loader size="small" color={colors.tint} />
```

### LoadingScreen

The `LoadingScreen` component should be used:

- For full-screen loading states
- When a screen is initially loading
- When waiting for critical data before rendering a screen

```tsx
import { LoadingScreen } from '@/components/Loader';

// In a component's render method
if (isLoading) {
  return <LoadingScreen />;
}

// With custom color
return <LoadingScreen color={colors.tint} />;
```

### LoadingContainer

The `LoadingContainer` component should be used:

- For component-level loading states
- Inside cards, panels, or sections
- When only a portion of the screen is loading

```tsx
import { LoadingContainer } from '@/components/Loader';

// Basic usage
<LoadingContainer />

// With custom height
<LoadingContainer height={200} />

// With large size
<LoadingContainer size="large" />
```

## Color Standards

- For full-screen loaders, use `colors.tint` for the loader color
- For component-level loaders, use `colors.tint` for the loader color
- Never use custom colors unless absolutely necessary for specific UI requirements

## Placement Standards

- Full-screen loaders should be centered both vertically and horizontally
- Component-level loaders should be centered within their container
- Never display text alongside loaders
- Never use borders or containers with different colors around loaders

## Implementation Examples

### Full-screen Loading

```tsx
import { LoadingScreen } from '@/components/Loader';

export default function MyScreen() {
  const [isLoading, setIsLoading] = useState(true);

  // ...

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    // Regular screen content
  );
}
```

### Component Loading

```tsx
import { LoadingContainer } from '@/components/Loader';

function MyCard({ isLoading, data }) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <LoadingContainer height={160} />
      </View>
    );
  }

  return <View style={styles.card}>{/* Card content */}</View>;
}
```

## Best Practices

1. Always use the appropriate loader component for the context
2. Maintain consistent sizing (large for screens, small for components)
3. Use the standard color (colors.tint) unless there's a specific design requirement
4. Never show text alongside loaders
5. Ensure loaders are properly centered in their containers
6. Use ThemedView for full-screen loaders to ensure proper theming
