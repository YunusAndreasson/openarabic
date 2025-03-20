# ThemedText Component Guidelines

The `ThemedText` component is a core UI component designed to ensure consistent typography and theming across the application. This document explains how to use the enhanced version effectively.

## Basic Usage

```tsx
import { ThemedText } from '@/components/ThemedText';

// Default body text with automatic theming
<ThemedText>Regular text content</ThemedText>

// Heading text
<ThemedText type="heading1">Page Title</ThemedText>
```

## Typography System

ThemedText supports a streamlined typography system with these semantic types:

| Type       | Description          | Usage                              |
| ---------- | -------------------- | ---------------------------------- |
| `body`     | Standard body text   | General content, main text         |
| `bodyBold` | Bold body text       | Emphasized content                 |
| `heading1` | Large heading        | Page titles, main headlines        |
| `heading2` | Medium heading       | Section headers                    |
| `heading3` | Small heading        | Subsection headers                 |
| `caption`  | Small text           | Supporting information, timestamps |
| `label`    | Small semi-bold text | Form labels, small headers         |
| `overline` | Tiny uppercase text  | Category labels, metadata          |
| `link`     | Clickable text       | Links and interactive text         |
| `arabic`   | Arabic text          | Arabic language content            |

> **Note**: For backward compatibility, legacy types `default`, `title`, `subtitle`, and `defaultSemiBold` are automatically mapped to their new equivalents.

```tsx
<ThemedText type="heading1">Main Title</ThemedText>
<ThemedText type="body">This is regular body text content.</ThemedText>
<ThemedText type="caption">Posted 2 hours ago</ThemedText>
<ThemedText type="overline">FEATURED</ThemedText>
```

## Semantic Variants

Use semantic variants to represent different message types with appropriate colors:

```tsx
<ThemedText variant="error">Invalid username or password</ThemedText>
<ThemedText variant="warning">Your session will expire soon</ThemedText>
<ThemedText variant="success">Profile updated successfully</ThemedText>
<ThemedText variant="info">Tip: You can press ? for keyboard shortcuts</ThemedText>
```

Other variants:

- `primary`: Default text color (same as omitting variant)
- `secondary`: Secondary text color (slightly muted)
- `subtle`: Subtle text for less important content
- `disabled`: Grayed out text for disabled elements

## Style Customization

### Weight

Control font weight directly without changing the text type:

```tsx
<ThemedText weight="bold">Bold text</ThemedText>
<ThemedText weight="600">Semi-bold text</ThemedText>
<ThemedText weight="300">Light text</ThemedText>
```

### Alignment

Set text alignment directly:

```tsx
<ThemedText align="center">Centered text</ThemedText>
<ThemedText align="right">Right-aligned text</ThemedText>
<ThemedText align="justify">Justified text that flows across multiple lines with even spacing between words.</ThemedText>
```

### Theme Colors

Use any color from the theme directly:

```tsx
<ThemedText colorName="link">Link-colored text</ThemedText>
<ThemedText colorName="success">Success-colored text</ThemedText>
```

### Additional Props

ThemedText also supports any standard Text props from React Native:

```tsx
<ThemedText numberOfLines={2} ellipsizeMode="tail">
  This text will be truncated after two lines with an ellipsis at the end...
</ThemedText>
```

## Best Practices

1. **Use semantic types** rather than manually styling text with size and weight
2. **Use semantic variants** for error, warning, success, and info messages
3. **Combine props when needed** to create specific styles:

```tsx
<ThemedText type="heading2" colorName="success" align="center">
  Operation Completed
</ThemedText>
```

4. **Be consistent** - don't mix raw `Text` components with `ThemedText`
5. **Use theme colors** rather than hard-coding color values:

```tsx
// Good
<ThemedText colorName="success">Success</ThemedText>

// Avoid
<ThemedText style={{ color: '#2E7D32' }}>Success</ThemedText>
```

By following these guidelines, we can maintain consistent typography and theming across the entire application.
