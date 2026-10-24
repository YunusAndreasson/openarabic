import type { ViewStyle } from 'react-native';

import { Colors, Theme } from '@/constants/colors';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

/**
 * The app's shadow system, expressed as CSS `boxShadow`.
 *
 * This replaced a set of `shadowOffset`/`shadowOpacity`/`shadowRadius` tokens
 * that were spread onto views directly. Those props have no Android path at
 * all — nothing in this app ever set `elevation` — and on iOS they are drawn by
 * the layer OUTSIDE its bounds, so a view that also carries `overflow: 'hidden'`
 * (which every card does, to clip progress bars to the corner radius) masks its
 * own shadow away. The system was shipping a shadow that neither platform
 * reliably drew, which is why nobody noticed BaseCard's default tier was one
 * step too heavy.
 *
 * `boxShadow` is spec-compliant and New-Architecture-only (which this app is).
 * It renders on Android 9+, it takes a spread, and — because CSS scopes
 * `overflow` to an element's CHILDREN — an element's own box-shadow is not
 * clipped by it.
 *
 * Roles, not magnitudes. The old table carried both (`SMALL` and `CARD` were
 * the same object under two names), which let call sites pick a size and then
 * drift from whatever the role was supposed to mean.
 *
 *   HAIRLINE — flush surfaces: separators, inline chips, expanded panels
 *   CARD     — content cards in normal flow
 *   FLOATING — FABs, MiniPlayer, floating overlays
 *   MODAL    — sheets, popovers, tooltips that sit above the surface
 *
 * `blur` is NOT the old `shadowRadius`. Core Graphics treats `shadowRadius` as
 * a Gaussian sigma; CSS `blur-radius` is roughly twice that, so each value here
 * is the old radius doubled (3→6, 6→12, 8→16, 12→24). `offsetY` carries over
 * unchanged.
 */
const ELEVATION_SPEC = {
  NONE: { offsetY: 0, blur: 0, opacity: 0 },
  HAIRLINE: { offsetY: 1, blur: 6, opacity: 0.12 },
  CARD: { offsetY: 2, blur: 12, opacity: 0.16 },
  FLOATING: { offsetY: 3, blur: 16, opacity: 0.2 },
  MODAL: { offsetY: 5, blur: 24, opacity: 0.25 },
} as const;

export type ElevationRole = keyof typeof ELEVATION_SPEC;

/**
 * No shadow. An empty shadow list rather than the string `'none'`: the array
 * form is the typed one, and it needs no parsing.
 */
const NO_SHADOW: ViewStyle = { boxShadow: [] };

/**
 * Dark mode has no shadows at all, and that is deliberate — separation there
 * comes from the surface colours, which step ~4% in lightness per level
 * (`elevation0` → `elevation3`). A shadow over a near-black page reads as a
 * smudge, not as height. Sepia keeps its shadows; it is a light theme.
 */
const buildTheme = (colors: ThemeColors, suppressed: boolean): Record<ElevationRole, ViewStyle> => {
  const entries = Object.entries(ELEVATION_SPEC) as [
    ElevationRole,
    (typeof ELEVATION_SPEC)[ElevationRole],
  ][];

  return Object.fromEntries(
    entries.map(([role, spec]) => [
      role,
      suppressed || spec.opacity === 0
        ? NO_SHADOW
        : {
            boxShadow: [
              {
                offsetX: 0,
                offsetY: spec.offsetY,
                blurRadius: spec.blur,
                spreadDistance: 0,
                color: withOpacity(colors.shadow, spec.opacity),
              },
            ],
          },
    ]),
  ) as Record<ElevationRole, ViewStyle>;
};

/**
 * Every (theme, role) pair, resolved once at module load.
 *
 * Keyed by the theme's colour object, whose identity is stable — `Colors[theme]`
 * returns the same frozen reference every time (see `useColors`). That is what
 * lets `getElevation` be a plain lookup rather than a hook: a component reads
 * `useColors()` once and derives its shadow from it, instead of paying a second
 * Redux + Appearance subscription just to ask whether the theme is dark.
 */
const BY_THEME: ReadonlyMap<ThemeColors, Record<ElevationRole, ViewStyle>> = new Map(
  Object.entries(Colors).map(([theme, colors]) => [
    colors,
    buildTheme(colors, theme === Theme.Dark),
  ]),
);

/**
 * The theme-aware shadow for a role. The returned object is identity-stable, so
 * it can sit in a style array without allocating on every render.
 */
export const getElevation = (colors: ThemeColors, role: ElevationRole): ViewStyle =>
  BY_THEME.get(colors)?.[role] ?? NO_SHADOW;
