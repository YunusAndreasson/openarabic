# OpenArabic UI design system

This document describes the shipped application UI. The separate
[`brand/DESIGN.md`](../brand/DESIGN.md) defines the app mark and generated brand
assets.

## Sources of truth

| Concern                                          | Source                                                      | Rule                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Theme colors                                     | `constants/colors.ts` and `types/ui/theme.types.ts`         | Components consume semantic `ThemeColors` through `useColors()`; palette values are implementation details.             |
| Spacing, size, radius, elevation, and type scale | `constants/layout.ts`                                       | Use `LAYOUT` and the exported typography/touch helpers instead of restating shared values.                              |
| Font families                                    | `constants/fonts.ts`                                        | English uses Inter; the default Arabic face is Noto Sans Arabic and may be replaced by the user's selected Arabic font. |
| Text                                             | `components/ThemedText.tsx`                                 | Use a named text type and semantic color/variant before adding local typography.                                        |
| Buttons and inputs                               | `components/ThemedButton.tsx`, `components/ThemedInput.tsx` | These own the standard control heights, states, typography, borders, and feedback.                                      |
| Reusable UI                                      | `components/ui/index.ts`                                    | Prefer the existing control or header primitive when its semantics match.                                               |

## Foundations

The layout system uses a 4 px base grid. Its public spacing scale is 1, 2, 4,
8, 12, 16, 24, 32, and 48 px. Standard screen horizontal padding is 12 px.
Touch targets are 32 px (compact), 44 px (standard), and 48 px (primary/mobile
minimum). Compact targets must use hit slop when the visual control is smaller
than the interactive area.

Corner radii are semantic: 10 px for compact controls, 16 px for standard
controls and cards, 20 px for large surfaces, and `PILL` for circular or pill
shapes. One-off geometry such as chart paths, illustrations, and animation
coordinates may use local numbers when no reusable UI meaning exists.

The English type roles are `heading1`, `heading2`, `heading3`, `body`,
`bodyBold`, `label`, `caption`, and `overline`. Arabic reading text uses
`arabic`; dense single-line indexes use `arabicCompact`. Do not apply the
English `weight` prop to Arabic text because it would replace the selected
Arabic font.

## Color and surfaces

Light, dark, and sepia themes expose the same semantic contract. UI code should
name intent (`text`, `secondaryText`, `tint`, `error`, `elevation1`,
`cardBorder`) rather than a palette hue. `elevation0` is the screen surface;
`elevation1` through `elevation3` are progressively raised surfaces. In dark
mode, surface color provides hierarchy and shadows are suppressed by
`getThemeAwareElevation`.

Status colors are reserved for meaning: success, warning, error, and info.
Charts use `getChartColors()` so data ink, reference lines, and performance
states remain consistent. Grammar colors are a dedicated educational palette
and are resolved through `utils/colorResolution.ts`; they are not general UI
accents.

Avoid raw hex, RGB, or named colors in components. Theme-aware overlays belong
in `ThemeColors`; local alpha transformations use `withOpacity`/`withAlpha`.
Transparent gradient stops and platform-native configuration are valid
exceptions when they do not encode a theme color.

## Component conventions

- Screens use `ThemedView` for the theme surface and safe-area behavior.
- Text uses `ThemedText`; local styles should normally control layout, not
  recreate font families, sizes, or semantic colors.
- Primary actions use `ThemedButton`. Icon-only actions use the shared icon and
  header-button primitives so hit targets and pressed states stay aligned.
- Form controls use `ThemedInput`, `Toggle`, `SettingsPicker`, `ThemePicker`, or
  `TimePicker` as appropriate.
- Card surfaces should use the semantic elevations and shared `BaseCard` where
  its interaction model fits.
- Re-export reusable primitives from their nearest `index.ts`; do not keep
  parallel wrappers with equivalent behavior.

## Maintenance

When changing the system, update the token implementation, its type contract,
and this document in the same change. Remove tokens only after repository-wide
usage checks, including computed access paths. `yarn typecheck:source`,
`yarn lint:source`, and `yarn check-unused` are the minimum static gates.
