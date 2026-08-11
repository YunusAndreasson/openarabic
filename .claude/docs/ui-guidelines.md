# Design System & UI Guidelines

## Color Theory & Palette

- **MANDATORY**: Use semantic colors from Colors.ts only
- **Primary palette**: `colors.tint` (sage green) for primary actions
- **Never use hardcoded hex values** - always reference theme colors
- **Green tint preference**: Avoid pure white, use subtle green tints for elevations

## Typography Hierarchy

- **MANDATORY**: Follow `TYPOGRAPHY_HIERARCHY` constants exactly
- **Arabic text**: Special handling with diacritics preservation
- **Scaling**: Use systematic progression (TINY → SMALL → MEDIUM → LARGE → HUGE)

## Spacing Grid System

- **MANDATORY**: Use `LAYOUT.SPACING` constants from layout.ts
- **Base unit**: 4pt system
  - TINY = 4px
  - SMALL = 8px
  - MEDIUM = 12px
  - LARGE = 16px
  - XLARGE = 24px
- **No ad-hoc pixel values** - if you need a size, add it to the constants
- **Touch targets**: Minimum 48dp using `MIN_TOUCH_TARGET` constants

## Elevation System

- **MANDATORY**: Use `LAYOUT.SHADOW` constants from layout.ts
- **Levels**: SUBTLE → SMALL → MEDIUM → LARGE for progressive elevation
- **Consistency**: Reference BaseCard.tsx for proper elevation usage

## UX Laws (Apply to All UI Work)

- **Tesler's Law**: Shift complexity to system design, not users
- **Hick's Law**: Limit choices to reduce decision time
- **Fitts' Law**: Large touch targets (48dp minimum), position frequently-used controls nearby
- **Miller's Law**: Group information in 5-9 item chunks
- **Jakob's Law**: Leverage familiar mobile patterns
- **Norman's Law**: Design should clearly communicate possible actions

## Performance Targets

- **Render Time**: <50ms (16.67ms ideal for 60fps)
- **Re-render Count**: <10 for stable components
- **Lists**: Always use @shopify/flash-list, not FlatList

## Critical Constants Files

- **[Colors.ts](constants/Colors.ts)** - Complete theme system
- **[layout.ts](constants/layout.ts)** - Typography, spacing, shadows
- **[strings.ts](constants/strings.ts)** - All user-facing text
- **[animation.ts](constants/animation.ts)** - Timing configurations

## Required Usage Patterns

- **Typography**: Use `TYPOGRAPHY_HIERARCHY` and `LAYOUT.TYPOGRAPHY.SCALE`
- **Spacing**: Use `LAYOUT.SPACING` scale
- **Elevation**: Use `LAYOUT.ELEVATION.SUBTLE/SMALL/MEDIUM/LARGE`
- **Colors**: Use semantic color names from Colors.ts
- **Strings**: Use `STRINGS.*` constants for all user-facing text
- **Animations**: Use `TIMING_CONFIG` and `SPRING_CONFIG` presets

## Flex Layout Patterns

Use constants from `utils/layoutUtils.ts` for common flex patterns:

```typescript
import { COMMON_STYLES } from '@/utils/layoutUtils';

// Flex container
<View style={COMMON_STYLES.flex1}>

// Row with centered items
<View style={COMMON_STYLES.row}>

// Centered row
<View style={COMMON_STYLES.centeredRow}>
```

## TEXT_STYLES Usage

Use pre-computed text styles from `layout.ts` for consistent typography:

```typescript
import { TEXT_STYLES } from '@/constants/layout';

// Card titles
<ThemedText style={{ ...TEXT_STYLES.CARD_TITLE }}>

// Section headers
<ThemedText style={{ ...TEXT_STYLES.SECTION_HEADER }}>

// Metadata text
<ThemedText style={{ ...TEXT_STYLES.METADATA }}>

// Author bylines
<ThemedText style={{ ...TEXT_STYLES.AUTHOR_BYLINE }}>
```

## Theme-Aware Shadows

Use `getThemeAwareElevation()` for shadows that adapt to dark mode:

```typescript
import { getThemeAwareElevation } from '@/constants/layout';
import { useColorScheme } from '@/hooks/theme/useColorScheme';

const { isDarkMode } = useColorScheme();
const elevation = getThemeAwareElevation('MEDIUM', isDarkMode);

<View style={[styles.card, elevation, { shadowColor: colors.shadow }]}>
```

Dark mode relies on elevation background colors for hierarchy (shadows are nearly invisible).

## Press Scale Constants

Use unified `PRESS_SCALE` from `animation.ts`:

```typescript
import { PRESS_SCALE } from '@/constants/animation';

// Default press (buttons, cards)
withTiming(PRESS_SCALE.DEFAULT); // 0.96

// Moderate press (toggles, interactive words)
withTiming(PRESS_SCALE.MODERATE); // 0.95

// Strong press (icon buttons)
withTiming(PRESS_SCALE.STRONG); // 0.9

// Drag feedback (scale up)
withTiming(PRESS_SCALE.DRAG_UP); // 1.05
```

## The primitive layer

Two buckets, one rule each:

- **`components/ui`** — interactive controls: buttons, links, pickers, toggles, icons.
- **`components/common`** — layout, state and composition: cards, rows, screen
  scaffolds, empty/error/loading states, badges, separators.

Import from the barrel (`@/components/ui`, `@/components/common`), not from the
file. The one exception is files _inside_ those two directories (and
`components/providers`), which must import each other by direct path — a barrel
import from inside a barrel closes a cycle that resolves to `undefined` at
runtime.

A component that calls a domain hook or the router is **not** a primitive. It
belongs in its feature directory (`components/practice/DictionaryButton.tsx`,
`components/playlist/EditModeButton.tsx`).

## Buttons

`ThemedButton` is the only text button. Two orthogonal axes:

```typescript
variant: 'filled' | 'tonal' | 'outlined' | 'ghost'; // how loud
tone: 'default' | 'destructive'; // which hue
```

- `filled` — the one primary action on a screen
- `tonal` — a secondary action that still reads as an action
- `outlined` — a peer alongside a filled one
- `ghost` — tertiary: "Not now", "Skip"

Sizes are `small | medium | large`, and the size alone decides the font (13 / 16
/ 18) via a `ThemedText` type. Never override a button's `fontSize`.

Icon-only controls, by where they live:

```typescript
import { IconButton, HeaderIconButton, GlassIconButton, TextLink } from '@/components/ui';

<IconButton icon="trash" tone="destructive" accessibilityLabel="Delete" onPress={...} />
<CloseButton />                                    // headerRight of every modal
<GlassIconButton icon="close" accessibilityLabel="Close article" onPress={...} />
<TextLink label="Forgot password?" onPress={...} /> // inline in a sentence
```

**Every icon-only control requires `accessibilityLabel`** — it is a required
prop on the header and glass buttons because there is no text to fall back on.

## Screen scaffolding

Three scaffolds, and the choice is decided by how the screen is presented:

| Screen                                                    | Use                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Pushed / modal under a nav header                         | `ScreenScaffold` (`components/common`)                                               |
| `presentation: 'formSheet'` route                         | `SheetScreen` — read its docblock first, it encodes react-native-screens constraints |
| Owns its own scroll container (FlashList, article reader) | `ThemedView` directly                                                                |

`ScreenScaffold` handles horizontal safe area, the 12px lead-in below the
header, and bottom padding that clears the home indicator. Do not re-derive
`insets.bottom` per screen.

## Bottom Sheet Dynamic Styles

Use `useBottomSheetDynamicStyles` for the sheet background, and
`BrandedBottomSheetHandle` for the grabber:

```typescript
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';
import { BrandedBottomSheetHandle } from '@/components/ui';

const dynamicStyles = useBottomSheetDynamicStyles();

<BottomSheet
  backgroundStyle={dynamicStyles.bottomSheet}
  handleComponent={BrandedBottomSheetHandle}
  ...
/>
```

Sheet titles go through `BottomSheetHeader` (`components/common`), not a
hand-rolled `View` + `ThemedText`.

## Typography

`ThemedText` has one colour axis (`colorName`) and one weight axis (`weight`).
A parallel `variant` prop and a `weight="medium"` that rendered Regular were
both removed — prefer a `type` that already carries the weight (`bodyBold`,
`heading3`) over overriding it.

## StyleSheet Best Practices

- Use `StyleSheet.create()` for static styles
- Use `useMemo` when styles depend on dynamic values (colors, state)
- Prefer shared style objects over inline styles for better performance

```typescript
// Static styles
const styles = StyleSheet.create({
  container: { flex: 1 },
});

// Dynamic styles with useMemo
const dynamicStyles = useMemo(
  () => ({
    card: [styles.card, { backgroundColor: colors.elevation1 }],
  }),
  [colors.elevation1],
);
```
