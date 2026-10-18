/**
 * Theme contrast invariants, measured on the real palette.
 *
 * - Every text ink clears WCAG AA (4.5:1) on every surface text sits on, in all
 *   three themes. Three light and three sepia inks used to sit between 3.2:1
 *   and 4.4:1 on the page, and ThemedText dimmed captions further with opacity.
 * - The elevation ladder rises in every theme. Sepia's elevation1 used to be
 *   darker than its page, so raised surfaces sank.
 * - A border is visible against the fill it outlines. Sepia's `border` used to
 *   BE its elevation1, so an input's resting edge was its own fill colour.
 */

import { describe, expect, test } from '@jest/globals';
import { wcagContrast } from 'culori';

import { Colors, type SolidColorName } from '@/constants/colors';

const THEMES = Object.entries(Colors);

const TEXT_INKS = [
  'text',
  'headingText',
  'arabicText',
  'secondaryText',
  'englishText',
  'secondary',
  'subtitleText',
  'authorText',
  'metadataText',
  'captionText',
  'textTertiary',
  'secondaryMetadataText',
  'subtleLabelText',
] as const satisfies readonly SolidColorName[];

const TEXT_SURFACES = [
  'background',
  'elevation0',
  'elevation1',
  'elevation2',
  'elevation3',
  'card',
] as const satisfies readonly SolidColorName[];

const AA_BODY_TEXT = 4.5;

describe('theme contrast', () => {
  describe.each(THEMES)('%s theme', (_name, colors) => {
    test.each(TEXT_INKS)('%s clears AA on every text surface', ink => {
      for (const surface of TEXT_SURFACES) {
        expect({
          surface,
          clears: wcagContrast(colors[ink], colors[surface]) >= AA_BODY_TEXT,
        }).toEqual({ surface, clears: true });
      }
    });

    test('each elevation step is at least as light as the one below it (dark: as dark)', () => {
      // Light and sepia raise a surface by lightening it; dark raises it by
      // lifting it off near-black, which is also lightening. Either way the
      // ladder must not run backwards.
      const ladder = [colors.elevation0, colors.elevation1, colors.elevation2, colors.elevation3];
      for (let level = 1; level < ladder.length; level += 1) {
        const below = ladder[level - 1] ?? '';
        const above = ladder[level] ?? '';
        expect(lightness(above)).toBeGreaterThanOrEqual(lightness(below));
      }
      expect(lightness(colors.elevation1)).toBeGreaterThan(lightness(colors.elevation0));
    });

    test("an input's resting border differs from the fill it outlines", () => {
      expect(wcagContrast(colors.border, colors.elevation1)).toBeGreaterThan(1.05);
    });
  });

  test('the sepia border stands off every sepia surface', () => {
    const sepia = Colors.sepia;
    for (const surface of TEXT_SURFACES) {
      expect({ surface, ratio: wcagContrast(sepia.border, sepia[surface]) > 1.1 }).toEqual({
        surface,
        ratio: true,
      });
    }
  });
});

/** Relative luminance ordering is enough here; contrast against white gives it. */
function lightness(hex: string): number {
  return 1 / wcagContrast(hex, '#ffffff');
}
