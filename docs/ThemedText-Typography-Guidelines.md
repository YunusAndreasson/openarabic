# ThemedText Typography Guidelines

This document outlines our improved typography system implemented through the ThemedText component.

## Typography Scale

We've refined our typography scale for better readability and visual hierarchy:

| Type       | Size | Description                   | Primary Use Cases                    |
| ---------- | ---- | ----------------------------- | ------------------------------------ |
| `heading1` | 30px | Large heading                 | Page titles, main headlines          |
| `heading2` | 24px | Medium heading                | Section headers                      |
| `heading3` | 20px | Small heading                 | Subsection headers                   |
| `body`     | 15px | Standard body text            | General content, article text        |
| `bodyBold` | 15px | Bold body text                | Emphasized content within paragraphs |
| `caption`  | 12px | Small text                    | Supporting information, timestamps   |
| `label`    | 12px | Small semi-bold text          | Form labels, small headers           |
| `overline` | 10px | Tiny uppercase text           | Category labels, metadata            |
| `link`     | 15px | Clickable text with underline | Links and interactive text           |
| `arabic`   | 17px | Arabic text (default size)    | Arabic language content              |

## Visual Hierarchy Guidelines

For proper visual hierarchy in your interfaces:

1. **Use appropriate heading levels**

   - `heading1` should appear only once per screen as the main title
   - `heading2` for major sections
   - `heading3` for subsections

2. **Body text best practices**

   - Use `body` for most content
   - Use `bodyBold` sparingly for emphasis
   - Avoid using custom font sizes and weights

3. **Supporting text elements**
   - Use `caption` for timestamps, bylines, and supporting text
   - Use `label` for input labels and list headers
   - Use `overline` for categories and status indicators (ALL CAPS)

## Semantic Variants

Combine text types with semantic variants for more expressive UI:

```jsx
<ThemedText type="caption" variant="error">
  Invalid input
</ThemedText>

<ThemedText type="overline" variant="secondary">
  FEATURED
</ThemedText>
```

Available variants:

- `primary` - Main content color (default)
- `secondary` - Less prominent text, descriptions
- `error` - Error messages
- `warning` - Warning messages
- `success` - Success messages
- `info` - Informational messages
- `subtle` - Even less prominent text
- `disabled` - Grayed out text

## Spacing Recommendations

For proper spacing between text elements, use container Views with margin:

```jsx
// Good practice
<View style={{ marginBottom: LAYOUT.SPACING.MEDIUM }}>
  <ThemedText type="overline" variant="secondary">
    CATEGORY
  </ThemedText>
  <ThemedText type="heading2">Section Title</ThemedText>
  <ThemedText type="body">This is the main content text.</ThemedText>
</View>

// Avoid adding margins to text elements directly
```

## Common UI Patterns

### Form Fields

```jsx
<View style={styles.formField}>
  <ThemedText type="label">Email Address</ThemedText>
  <TextInput style={styles.input} />
  <ThemedText type="caption" variant="error">
    Please enter a valid email
  </ThemedText>
</View>
```

### Cards

```jsx
<View style={styles.card}>
  <ThemedText type="overline" variant="secondary">
    ARTICLE
  </ThemedText>
  <ThemedText type="heading3">Card Title</ThemedText>
  <ThemedText type="body">Card description text that might span a couple of lines.</ThemedText>
  <ThemedText type="caption">2 days ago</ThemedText>
</View>
```

### List Items

```jsx
<View style={styles.listItem}>
  <ThemedText type="body">List item primary text</ThemedText>
  <ThemedText type="caption" variant="secondary">
    Supporting text
  </ThemedText>
</View>
```

## Accessibility Considerations

- Maintain appropriate contrast ratios (at least 4.5:1 for most text)
- Don't use font sizes smaller than our defined minimums
- Ensure text scales properly with system font size changes
- Use semantic variants to reinforce meaning (e.g., `error` for error messages)

By following these guidelines, we can maintain a consistent, accessible, and visually pleasing interface across our app.
