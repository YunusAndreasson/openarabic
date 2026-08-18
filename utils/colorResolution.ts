/**
 * Shared color resolution utility for grammar color coding
 * Single source of truth for resolving color names to hex values
 */

import type { SolidColorName } from '@/constants/colors';
import type { GrammarColorName, ThemeColors } from '@/types/ui/theme.types';

/**
 * Determine if color-coding should be applied to text
 * Single words should never have grammar color-coding
 *
 * @param text - The text to check
 * @returns true if color-coding should be applied (multi-word text)
 */
export function shouldApplyColorCoding(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount > 1;
}

/** The theme colours the Arabic analyser may paint a segment with directly. */
type FlatColorCandidate = 'tint' | 'warning' | 'accent' | 'violet' | 'arabicText' | 'text';

/**
 * Valid flat color names used by Arabic word analysis.
 *
 * Intersected with `SolidColorName` on purpose: every one of these must be a
 * colour `ThemeColors` actually defines as a plain string. Rename or drop one
 * there and it falls out of this union, out of {@link ValidColorName}, and the
 * build then fails at each segment that paints with it — rather than the name
 * surviving and resolving to `undefined` at runtime, drawing a word in no
 * colour at all.
 *
 * Type-level rather than a `readonly SolidColorName[]` array because nothing
 * needs the list at runtime any more: membership used to be tested by hand,
 * and is now decided by the union itself.
 */
export type FlatColorName = Extract<SolidColorName, FlatColorCandidate>;

/**
 * All valid color names for Arabic word analysis
 * Grammar colors use 'grammar.{key}' format, flat colors use just the key
 */
export type ValidColorName = FlatColorName | `grammar.${GrammarColorName}`;

/** The namespace that separates a grammar colour from a flat theme colour. */
const GRAMMAR_PREFIX = 'grammar.';

/**
 * Split the two arms of {@link ValidColorName}.
 *
 * A `startsWith` test does not narrow a template-literal union on its own, so
 * this states the correspondence once instead of every caller re-asserting it.
 */
function isGrammarColor(colorName: ValidColorName): colorName is `grammar.${GrammarColorName}` {
  return colorName.startsWith(GRAMMAR_PREFIX);
}

/**
 * Resolve a color name string to an actual hex color value
 * Handles both grammar colors ('grammar.preposition') and flat colors ('tint')
 *
 * Takes the closed {@link ValidColorName} union, not `string`. That removes
 * both of this function's fallbacks-to-`colors.text`: an unknown flat name and
 * an unknown `grammar.*` key were each unreachable-but-unprovable, and each
 * silently painted a segment the body colour instead of failing anywhere a
 * developer would see it.
 *
 * @param colorName - The color name to resolve (e.g., 'grammar.preposition' or 'tint')
 * @param colors - The current theme's color palette
 * @returns The resolved hex color string
 */
export function resolveColorName(colorName: ValidColorName, colors: ThemeColors): string {
  // Handle grammar colors (grammar.preposition, grammar.possessive, etc.)
  if (isGrammarColor(colorName)) {
    return colors.grammar[colorName.slice(GRAMMAR_PREFIX.length) as GrammarColorName];
  }

  return colors[colorName];
}
