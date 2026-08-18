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

- **MANDATORY**: Resolve shadows through `getElevation(colors, role)` from
  `constants/elevation.ts`. There is no spreadable raw token, deliberately —
  eleven call sites used to spread one and skip the theme-aware path, which made
  them the only surfaces still casting a shadow in dark mode.
- **Roles, not sizes**: `HAIRLINE` → `CARD` → `FLOATING` → `MODAL`
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
- **Elevation**: Use `getElevation(colors, 'HAIRLINE' | 'CARD' | 'FLOATING' | 'MODAL')`
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

// Author bylines
<ThemedText style={{ ...TEXT_STYLES.AUTHOR_BYLINE }}>
```

## Theme-Aware Shadows

`getElevation()` takes the resolved theme colours and returns a CSS `boxShadow`
style. It needs no `isDarkMode` argument — the theme's colour object identifies
the theme, so a component reads `useColors()` once and derives the shadow from
it rather than paying a second Redux + Appearance subscription to ask.

```typescript
import { getElevation } from '@/constants/elevation';
import { useColors } from '@/hooks/theme/useColors';

const colors = useColors();

<View style={[styles.card, getElevation(colors, 'FLOATING')]}>
```

The returned object is identity-stable per (theme, role), so it can sit in a
style array without allocating on every render.

Dark mode relies on elevation background colors for hierarchy; `getElevation`
returns no shadow there. Shadows are `boxShadow`, not the legacy
`shadowOffset`/`shadowOpacity`/`shadowRadius` props — those never drew on
Android, and on iOS a view with `overflow: 'hidden'` clipped its own shadow away.

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

Three buckets, in dependency order:

- **`components/primitives`** — `ThemedText`, `ThemedView`, `ThemedButton`,
  `ThemedInput`. The base layer, imported by everything including the two below.
  It deliberately has **no barrel**: import
  `@/components/primitives/ThemedText` directly. Sitting below `ui` and `common`
  with no index is what makes it structurally impossible for these to join a
  cycle — and `ThemedText` alone has ~84 importers, so a cycle through it would
  be the worst possible one.
- **`components/ui`** — interactive controls: buttons, links, pickers, toggles, icons.
- **`components/common`** — layout, state and composition: cards, rows, screen
  scaffolds, empty/error/loading states, badges, separators.

Import `ui` and `common` from their barrels (`@/components/ui`,
`@/components/common`), not from the file. The one exception is files _inside_
`ui`, `common`, `providers` or `primitives`, which must import each other by
direct path — a barrel import from inside a barrel closes a cycle that resolves
to `undefined` at runtime. `no-restricted-imports` in `eslint.config.mjs` makes
that a lint error rather than a blank screen.

A component that calls a domain hook or the router is **not** a primitive. It
belongs in its feature directory (`components/practice/DictionaryButton.tsx`,
`components/playlist/EditModeButton.tsx`).

## Buttons

`ThemedButton` is the only text button. Three orthogonal axes:

```typescript
variant: 'filled' | 'tonal' | 'outlined' | 'ghost'; // how loud
tone: 'default' | 'destructive'; // which hue
shape: 'rounded' | 'pill'; // which silhouette
```

- `filled` — the one primary action on a screen
- `tonal` — a secondary action that still reads as an action
- `outlined` — a peer alongside a filled one
- `ghost` — tertiary: "Not now", "Skip"

`shape="pill"` is reserved for a standalone prominent CTA with no peer beside it
(`PinnedActionButton`). Two shapes in one row read as two unrelated controls, so
loudness inside a row is carried by the fill, never by the radius.

Sizes are `small | medium | large`, and the size alone decides the font (13 / 16
/ 18) via a `ThemedText` type. Never override a button's `fontSize`.

Use `fullWidth` to stretch a button — never `style={{ width: '100%' }}`. External
spacing belongs to the parent's `gap`, not to the button. **`style=` on a
`ThemedButton` is legal only for a genuinely one-off surface treatment** (the
dashed drop target in `FeedbackForm` is the one sanctioned case) — never for
width, spacing, radius, or typography. Each of those has an axis; if the axis
doesn't fit, the fix is at the call site or in the component, not an override.

### Press behaviour

All of it comes from `hooks/ui/useButtonPress` — haptic, Android ripple,
press-scale, and a repeat-press lock that is **always on**. Nothing needs to opt
in, and no caller should hand-roll a double-tap guard; a `loading` prop wired to
real mutation state is still worth having for anything that takes seconds, but
it covers a different window than the lock does.

Two press idioms, and one rule for choosing between them:

| The element…                           | Idiom                                              |
| -------------------------------------- | -------------------------------------------------- |
| has its own surface **and** layout box | `useButtonPress` — spring scale + haptic + ripple  |
| is a run of text or a bare glyph       | `({ pressed }) => opacity: LAYOUT.OPACITY.PRESSED` |

Gesture-driven animation is a Reanimated worklet (`usePressAnimation`);
state-driven animation is a Reanimated CSS transition. Press-in runs on a 120ms
timing curve rather than a spring, because it has to finish while the finger is
still down — a tap holds contact for 60–120ms, and `SPRING_CONFIG.BUTTON` needs
314ms to arrive.

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
- Write dynamic styles inline. **The React Compiler is enabled**
  (`app.json` → `experiments.reactCompiler`), so it memoizes them for you — and
  manual memoization it cannot validate makes it bail out of optimizing that
  component entirely, which is worse than not having written it.
- Prefer shared style objects over inline styles for better performance

```typescript
// Static styles
const styles = StyleSheet.create({
  container: { flex: 1 },
});

// Dynamic styles — no useMemo; the compiler caches this
const cardStyle = [styles.card, { backgroundColor: colors.elevation1 }];
```

For a value used once per list row, prefer a module-level cache keyed by the
theme object over any memo hook — see `getElevation` and `BaseCard`'s surface
cache. That gives one shared object across every row rather than one per
component instance.
