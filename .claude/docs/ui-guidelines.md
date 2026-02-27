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

## Header Button Components

Use shared header button abstractions from `components/ui/`:

```typescript
// Transparent header buttons (iOS glass effect)
import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
<TransparentHeaderButton iconName="close" onPress={handleClose} />

// Navigation buttons (close/done with router.back())
import { CloseButton, DoneButton } from '@/components/ui';
<CloseButton onPress={optionalHandler} />
<DoneButton />

// Button groups in headers
import { HeaderButtonGroup } from '@/components/ui/HeaderButtonGroup';
<HeaderButtonGroup>
  <DictionaryButton />
  <StartReviewButton />
</HeaderButtonGroup>
```

## Bottom Sheet Dynamic Styles

Use `useBottomSheetDynamicStyles` hook for consistent theming:

```typescript
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';

const dynamicStyles = useBottomSheetDynamicStyles();

<BottomSheet
  backgroundStyle={dynamicStyles.bottomSheet}
  handleIndicatorStyle={dynamicStyles.indicator}
  ...
/>
```

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
