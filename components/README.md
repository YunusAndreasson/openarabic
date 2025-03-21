# Component Usage Guidelines

## Typography with ThemedText

`ThemedText` is the primary component for rendering text in the application. It provides consistent styling based on type and variant.

### Basic Usage

```jsx
<ThemedText type="body" variant="primary">
  This is some body text
</ThemedText>

<ThemedText type="heading2" variant="secondary">
  This is a secondary heading
</ThemedText>
```

### Available Types

- `heading1`, `heading2`, `heading3` - Hierarchical headings
- `body` - Standard text (default)
- `caption` - Smaller text for captions
- `label` - Text for form labels or small indicators
- `overline` - ALL CAPS small text for section headers

### Available Variants

- `primary` - Main content text (default)
- `secondary` - Less prominent text, descriptions
- `error` - Error messages
- `warning` - Warning messages
- `success` - Success messages

### When NOT to use custom styles

Avoid using the `style` prop for:

- Changing font size
- Changing font weight
- Changing font color
- Changing letter spacing

Instead, choose the appropriate type and variant.

### When custom styles ARE appropriate

Use the `style` prop sparingly for:

- Font scaling adjustments
- Text transform in specific cases
- Alignment when necessary

## Animated Text

For animated text elements, use the `AnimatedText` component instead of trying to apply animation styles directly to `ThemedText`.

### Correct Usage

```jsx
<AnimatedText type="heading1" variant="primary" animatedViewStyle={opacityStyle}>
  Animated heading with proper typography
</AnimatedText>
```

### Key Pattern: Separate Animation from Typography

Always keep animation styles separate from text styles:

- Use `animatedViewStyle` for animation properties
- Use `type` and `variant` for typography
- Use `style` only for exceptional text styling

### Avoid Common Pitfalls

```jsx
// ❌ INCORRECT: Don't mix animation with text styles
<Animated.Text style={[styles.text, opacityStyle]}>Text</Animated.Text>

// ✅ CORRECT: Use AnimatedText with proper separation
<AnimatedText
  type="body"
  animatedViewStyle={opacityStyle}
>
  Text
</AnimatedText>
```

## BaseCard Animation

When using BaseCard components:

```jsx
// ❌ DEPRECATED: Don't use the animated prop
<BaseCard animated={false}>...</BaseCard>

// ✅ CORRECT: Use includePressAnimation instead
<BaseCard includePressAnimation={false}>...</BaseCard>
```
