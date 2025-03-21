# ESLint Rule for ThemedText Usage

This document explains how to configure and use the custom ESLint rule that enforces the use of `ThemedText` instead of React Native's native `Text` component.

## Installation

1. Copy the `eslint-rules/no-direct-text.js` file to your project.

2. Add the rule to your ESLint configuration:

```js
// .eslintrc.js
module.exports = {
  // ... your other ESLint config
  plugins: [
    // ... other plugins
    'custom-rules',
  ],
  rules: {
    // ... other rules
    'custom-rules/no-direct-text': 'error',
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', './'],
          // other aliases
        ],
      },
    },
  },
};
```

3. Register the custom rules:

```js
// eslint-config/index.js
module.exports = {
  // ... other exports
  plugins: {
    'custom-rules': {
      rules: {
        'no-direct-text': require('../eslint-rules/no-direct-text'),
      },
    },
  },
};
```

## Rule Options

The rule accepts the following options:

```js
'custom-rules/no-direct-text': ['error', {
  // Allow Text in test files? Default is true
  allowInTests: true,

  // Files to exclude from checking, accepts glob patterns
  excludedFiles: [
    'components/ThemedText.tsx',
    '__mocks__/**',
    // Add other exclusions as needed
  ]
}]
```

## Fixing Violations

This rule provides automatic fixes:

- For imports: Removes the `Text` import and adds the `ThemedText` import if needed
- For JSX elements: Replaces `<Text>` with `<ThemedText>`

Run ESLint with the `--fix` option to automatically apply these changes:

```bash
npx eslint . --fix
```

## Examples

### Violations

```tsx
// Importing Text directly from react-native
import { View, Text, StyleSheet } from 'react-native';

// Using Text directly in JSX
const MyComponent = () => (
  <View>
    <Text>Hello world</Text>
  </View>
);
```

### Fixed Code

```tsx
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

const MyComponent = () => (
  <View>
    <ThemedText>Hello world</ThemedText>
  </View>
);
```

## Limitations

1. The rule only handles simple cases of Text usage - complex nested JSX may require manual updates
2. Style conversion is limited - it does not automatically transform style props to ThemedText props
3. If your component renders Text conditionally or programmatically, you may need manual updates

## Next Steps

After implementing this rule:

1. Run the migration script (`scripts/migrate-test-files.js`) to update test files
2. Review all changes and run tests to ensure nothing breaks
3. Update documentation to reflect the new typography approach
