# Color Usage Guidelines

This document outlines best practices for working with colors in the OpenArabic application to ensure consistent theming and proper support for both light and dark modes.

## Core Principles

1. **Never hardcode colors** - Always use colors from `Colors.ts` via the `useColors` hook
2. **Support both themes** - All UI components must work in both light and dark themes
3. **Use semantic color names** - Use color names that describe their purpose, not their appearance
4. **Maintain contrast ratios** - Ensure text has sufficient contrast against its background
5. **Use opacity consistently** - When using opacity, prefer theme colors with opacity modifiers

## Using Colors in Components

### Correct Pattern

```tsx
import { useColors } from '@/hooks/useColors';

function MyComponent() {
  const colors = useColors();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  );
}
```

### Incorrect Patterns

```tsx
// ❌ Don't hardcode colors
<Text style={{ color: '#000000' }}>Bad Example</Text>

// ❌ Don't use direct color scheme checks
const isDarkMode = colors.background === '#121212';

// ❌ Don't use Colors directly
import { Colors } from '@/constants/Colors';
<View style={{ backgroundColor: Colors.light.background }}>
```

## Using ThemedText

Always use the `ThemedText` component for text elements, which automatically handles default text colors:

```tsx
// For default text color
<ThemedText>Regular text</ThemedText>

// For custom colored text
<ThemedText
  style={{ color: colors.tint }}
  skipDefaultColor
>
  Custom colored text
</ThemedText>
```

## Adding Transparency/Opacity

When you need semi-transparent colors, use the following pattern with opacity modifiers:

```tsx
// Recommended: Use opacity notation with hex values
backgroundColor: colors.tint + '30'; // 30 = ~19% opacity (hex)

// Alternative: Convert to rgba for more readable opacity values
backgroundColor: `rgba(${hexToRgb(colors.tint)}, 0.2)`;
```

## Using Color Utilities

The app includes powerful color utilities that should be used for complex color operations. Import them from `utils/colorUtils.ts`:

```tsx
import { withOpacity, lighten, darken } from '@/utils/colorUtils';

function MyComponent() {
  const colors = useColors();

  return (
    <View>
      {/* Semi-transparent background (30% opacity) */}
      <View style={{ backgroundColor: withOpacity(colors.tint, 0.3) }} />

      {/* Lightened color (20% lighter) */}
      <View style={{ backgroundColor: lighten(colors.tint, 0.2) }} />

      {/* Darkened color (30% darker) */}
      <View style={{ backgroundColor: darken(colors.tint, 0.3) }} />
    </View>
  );
}
```

Available utility functions:

- `hexToRgb(hex)` - Convert hex to RGB components string
- `withOpacity(hex, opacity)` - Create rgba color with opacity
- `withHexOpacity(hex, opacity)` - Create hex color with alpha
- `lighten(hex, amount)` - Lighten a color
- `darken(hex, amount)` - Darken a color

## Themes and Status Colors

Use semantic status colors for consistent user feedback:

- `colors.success` - For success states, completed actions
- `colors.warning` - For warning states, pending actions
- `colors.error` - For error states, failed actions
- `colors.info` - For informational states, neutral actions

## Shadow and Elevation

Use theme-aware shadows instead of hardcoded shadow colors:

```tsx
shadowColor: colors.shadow,
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
```

## Background and Overlay Colors

For overlays and subtle backgrounds:

- `colors.overlay` - Light overlay for background elements
- `colors.modalOverlay` - Modal/dialog overlay
- `colors.textOverlay` - Text overlay for darkening/lightening

## Adding New Colors

When adding new colors:

1. Add the color to both light and dark themes in `constants/Colors.ts`
2. Use semantic naming that describes the purpose, not the appearance
3. Add TypeScript types if needed to `ColorName` type

## Tools and Scripts

Use the provided tools to ensure color consistency:

- `npm run update-app-config` - Updates `app.json` with theme colors
- `npm run prebuild` - Automatically runs the update script before builds

## Common Issues and Solutions

- **Test with both themes**: Always switch between light and dark mode when developing
- **Watch for contrast issues**: Ensure text remains readable in both themes
- **Beware of semi-transparency**: Be careful with overlapping transparent elements
- **Use design tokens**: Prefer layout constants from `LAYOUT` instead of magic numbers

By following these guidelines, we maintain a consistent look and feel across the application while properly supporting both light and dark themes.
