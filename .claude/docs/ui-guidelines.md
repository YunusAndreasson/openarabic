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
