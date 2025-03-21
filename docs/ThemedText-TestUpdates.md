# ThemedText Adoption in Test Files

This document provides guidelines for updating test files to use the `ThemedText` component instead of React Native's native `Text` component.

## Why Update Tests?

While tests can continue to use React Native's `Text` component without affecting functionality, there are benefits to updating them:

1. **Consistency**: Makes test files match the patterns used in production code
2. **Accurate Snapshots**: Ensures test snapshots accurately reflect the production UI
3. **Type Safety**: Leverages TypeScript types for component props
4. **Better Testing**: Tests the actual components used in production

## Prioritization

Update test files in this order:

1. **Component Tests**: Tests that verify UI components should be updated first
2. **Integration Tests**: Tests that verify flows and interactions
3. **Mock Components**: Components used for mocking in tests

## Implementation Guide

### Basic Text Replacement

Replace:

```tsx
import { Text } from 'react-native';
// ...
<Text>Loading...</Text>;
```

With:

```tsx
import { ThemedText } from '@/components/ThemedText';
// ...
<ThemedText>Loading...</Text>
```

### Text with Styling

Replace:

```tsx
<Text style={{ fontWeight: 'bold' }}>Bold Text</Text>
```

With:

```tsx
<ThemedText weight="bold">Bold Text</ThemedText>
```

### Text with Test IDs

Maintain test IDs:

```tsx
// Before
<Text testID="progress-indicator">Progress: 50%</Text>

// After
<ThemedText testID="progress-indicator">Progress: 50%</ThemedText>
```

## Examples From Codebase

```tsx
// Before
if (loading) return <Text>Loading...</Text>;

// After
if (loading) return <ThemedText>Loading...</ThemedText>;
```

```tsx
// Before
<Text testID="word-text">{word.text}</Text>
<Text testID="word-translation">{word.translation}</Text>

// After
<ThemedText testID="word-text">{word.text}</ThemedText>
<ThemedText testID="word-translation">{word.translation}</ThemedText>
```

## Special Cases

### Vector Icon Mocks

For the vector icon mocks, it's appropriate to keep using the native `Text` component as this is mocking a library:

```tsx
// This should remain as is in __mocks__/@expo/vector-icons.js
return ({ name, size, color, ...props }) => <Text {...props}>{name}</Text>;
```

## Next Steps

1. Create an automated migration script if a large number of test files need to be updated
2. Update snapshot tests after migration
3. Consider a linting rule to prevent direct usage of `Text` in new code
