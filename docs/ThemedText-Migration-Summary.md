# ThemedText Migration Summary

This document summarizes the key patterns and lessons learned during the migration to properly use the `ThemedText` component.

## Key Patterns Observed

During the migration, we observed several common patterns that needed to be addressed:

1. **Direct style overrides**: Many components passed custom styles directly to `ThemedText` instead of using the type and variant system.
2. **skipDefaultColor usage**: Components frequently used `skipDefaultColor` together with custom color styles.
3. **Custom text wrapping**: Custom styles were often used for layout purposes (padding, margins) that should be handled by container components.
4. **Missing semantic variants**: Semantic meaning through variant props was underutilized.

## Best Practices

Based on our migration, here are the recommended best practices for using `ThemedText`:

### 1. Use type and variant props

Always prefer using the built-in type and variant props over custom styling:

```tsx
// ❌ Avoid this:
<ThemedText
  style={{
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error
  }}
>
  Error message
</ThemedText>

// ✅ Do this instead:
<ThemedText
  type="body"
  variant="error"
  weight="bold"
>
  Error message
</ThemedText>
```

### 2. Use container-based layout

Use container components for layout-related styles, keeping `ThemedText` focused on typography:

```tsx
// ❌ Avoid this:
<ThemedText
  style={{
    marginTop: 16,
    paddingHorizontal: 8,
    textAlign: 'center'
  }}
>
  Centered text with spacing
</ThemedText>

// ✅ Do this instead:
<View style={{
  marginTop: 16,
  paddingHorizontal: 8,
  alignItems: 'center'
}}>
  <ThemedText align="center">
    Centered text with spacing
  </ThemedText>
</View>
```

### 3. Use color props over custom colors

Use the built-in `variant` or `colorName` props for colors instead of custom color styles:

```tsx
// ❌ Avoid this:
<ThemedText
  style={{ color: colors.tint }}
  skipDefaultColor
>
  Highlighted text
</ThemedText>

// ✅ Do this instead:
<ThemedText
  colorName="tint"
  // or
  variant="primary"
>
  Highlighted text
</ThemedText>
```

### 4. Use arabic type for Arabic text

When displaying Arabic text, use the dedicated arabic type:

```tsx
// ❌ Avoid this:
<ThemedText
  style={{
    ...getArabicTextStyle(32, {
      fontWeight: '600',
      textAlign: 'right',
    })
  }}
  skipDefaultColor
>
  كلمة
</ThemedText>

// ✅ Do this instead:
<ThemedText
  type="arabic"
  arabicFontSize={32}
  weight="600"
  align="right"
>
  كلمة
</ThemedText>
```

### 5. Use semantic variants for meaningful colors

Match the variant to the semantic meaning of the text:

```tsx
<ThemedText variant="error">Error message</ThemedText>
<ThemedText variant="warning">Warning message</ThemedText>
<ThemedText variant="success">Success message</ThemedText>
<ThemedText variant="info">Information message</ThemedText>
<ThemedText variant="primary">Primary text</ThemedText>
<ThemedText variant="secondary">Secondary text</ThemedText>
<ThemedText variant="subtle">Subtle text</ThemedText>
<ThemedText variant="disabled">Disabled text</ThemedText>
```

## Common Patterns by Component Type

We identified several reusable patterns for common component types:

### Labels and Captions

```tsx
<ThemedText type="caption" variant="secondary" weight="600">
  Label text
</ThemedText>
```

### Headers

```tsx
<ThemedText
  type="heading1" // or heading2, heading3
  weight="bold"
>
  Header text
</ThemedText>
```

### Status indicators

```tsx
<ThemedText
  type="caption"
  variant="success" // or error, warning, etc.
>
  Status message
</ThemedText>
```

## Ongoing Recommendations

1. **Create a style guide**: Document all standard text types and variants with examples.
2. **ESLint rule**: Continue enforcing proper `ThemedText` usage with ESLint.
3. **Component review**: Regularly audit components for proper `ThemedText` usage.
4. **Update documentation**: Keep documentation current when new types or variants are added.

## Future Considerations

1. Consider creating component shortcuts for common text patterns (e.g., `<Label>`, `<Caption>`, etc.)
2. Explore responsive typography options for different screen sizes
3. Audit the codebase for remaining instances of custom text styling
