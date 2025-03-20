# ThemedText Migration Guide

This guide helps you migrate to the consolidated ThemedText component with a streamlined set of text variants.

## Type Mapping

The following table shows how to map the old types to new types:

| Old Type          | New Type   | Notes                                  |
| ----------------- | ---------- | -------------------------------------- |
| `default`         | `body`     | Default text style for general content |
| `title`           | `heading1` | For main page titles                   |
| `subtitle`        | `heading2` | For section headers                    |
| `defaultSemiBold` | `bodyBold` | Emphasized body text                   |

> **Note**: For backward compatibility, the old types will continue to work but are deprecated and will map to their new equivalents automatically.

## Migration Steps

### 1. Replace direct Text components with ThemedText

Instead of using React Native's Text component:

```tsx
// Before
import { Text } from 'react-native';

function MyComponent() {
  return <Text>Hello World</Text>;
}
```

Use ThemedText:

```tsx
// After
import { ThemedText } from '@/components/ThemedText';

function MyComponent() {
  return <ThemedText>Hello World</ThemedText>;
}
```

### 2. Update type props to use new semantic types

```tsx
// Before
<ThemedText type="title">Page Title</ThemedText>
<ThemedText type="default">Regular text</ThemedText>
<ThemedText type="defaultSemiBold">Emphasized text</ThemedText>

// After
<ThemedText type="heading1">Page Title</ThemedText>
<ThemedText type="body">Regular text</ThemedText>
<ThemedText type="bodyBold">Emphasized text</ThemedText>
```

### 3. Use weight and align props instead of custom styles

```tsx
// Before
<ThemedText style={{ fontWeight: 'bold', textAlign: 'center' }}>
  Centered Bold Text
</ThemedText>

// After
<ThemedText weight="bold" align="center">
  Centered Bold Text
</ThemedText>
```

### 4. Use semantic variants for message types

```tsx
// Before
<ThemedText style={{ color: colors.error }}>Error message</ThemedText>

// After
<ThemedText variant="error">Error message</ThemedText>
```

### 5. Use colorName for theme colors

```tsx
// Before
<ThemedText style={{ color: colors.link }}>Link text</ThemedText>

// After
<ThemedText colorName="link">Link text</ThemedText>
```

## Benefits of Migration

1. **Consistency**: All text in the app will use the same typography system
2. **Maintainability**: Easier to update typography styles across the app
3. **DRY code**: Less repetition of style definitions
4. **Semantics**: Text is styled according to its purpose, not appearance
5. **Theme support**: Better dark/light mode handling

## Best Practices

1. Use the most specific type for your content:

   - `heading1`, `heading2`, `heading3` for hierarchical headings
   - `body` for main content
   - `caption` for supporting text
   - `label` for form labels and small headers
   - `overline` for categorization and metadata

2. Combine props when needed for special cases:

   ```tsx
   <ThemedText type="body" weight="bold" colorName="success" align="center">
     Custom styled text
   </ThemedText>
   ```

3. Prefer semantic variants over direct color application:

   ```tsx
   // Good
   <ThemedText variant="error">Error message</ThemedText>

   // Avoid
   <ThemedText style={{ color: '#f44336' }}>Error message</ThemedText>
   ```

By following these guidelines, you'll help maintain a consistent design language across the application.
