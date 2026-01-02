/**
 * Shared color resolution utility for grammar color coding
 * Single source of truth for resolving color names to hex values
 */

import { GRAMMATICAL_ROLE_COLORS } from '@/constants/arabicWordComponents';
import type { GrammarColorName, ThemeColors } from '@/types/ui/theme.types';

/**
 * Valid grammar color keys - derived from GRAMMATICAL_ROLE_COLORS (single source of truth)
 * Uses Set to deduplicate (some roles share colors via fallback)
 */
const validGrammarKeys = [
  ...new Set(
    Object.values(GRAMMATICAL_ROLE_COLORS).map(colorName => colorName.replace('grammar.', '')),
  ),
] as GrammarColorName[];

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

/**
 * Valid flat color names used by Arabic word analysis
 * These map directly to top-level ThemeColors properties
 */
export const FLAT_COLOR_KEYS = [
  'tint',
  'warning',
  'accent',
  'violet',
  'arabicText',
  'text',
] as const;

export type FlatColorName = (typeof FLAT_COLOR_KEYS)[number];

/**
 * All valid color names for Arabic word analysis
 * Grammar colors use 'grammar.{key}' format, flat colors use just the key
 */
export type ValidColorName = FlatColorName | `grammar.${GrammarColorName}`;

/**
 * Type guard to check if a color name is a valid flat color
 */
function isFlatColor(colorName: string): colorName is FlatColorName {
  return (FLAT_COLOR_KEYS as readonly string[]).includes(colorName);
}

/**
 * Resolve a color name string to an actual hex color value
 * Handles both grammar colors ('grammar.preposition') and flat colors ('tint')
 *
 * @param colorName - The color name to resolve (e.g., 'grammar.preposition' or 'tint')
 * @param colors - The current theme's color palette
 * @returns The resolved hex color string
 */
export function resolveColorName(colorName: string, colors: ThemeColors): string {
  // Handle grammar colors (grammar.preposition, grammar.possessive, etc.)
  if (colorName.startsWith('grammar.')) {
    const grammarKey = colorName.slice(8) as GrammarColorName; // 'grammar.'.length === 8
    const grammarColor = colors.grammar[grammarKey];
    if (grammarColor) {
      return grammarColor;
    }
    // Fallback for unknown grammar colors
    return colors.text;
  }

  // Handle flat colors
  if (isFlatColor(colorName)) {
    return colors[colorName];
  }

  // Fallback for unknown colors
  return colors.text;
}

/**
 * Type guard to validate that a color name is valid
 * Throws an error if invalid - use for strict validation during development
 */
export function assertValidColorName(colorName: string): asserts colorName is ValidColorName {
  if (colorName.startsWith('grammar.')) {
    const grammarKey = colorName.slice(8);
    if (!validGrammarKeys.includes(grammarKey as GrammarColorName)) {
      throw new Error(
        `Invalid grammar color name "${colorName}". ` +
          `Valid grammar colors: ${validGrammarKeys.map(k => `grammar.${k}`).join(', ')}. ` +
          `This indicates a bug in the word analysis logic that must be fixed.`,
      );
    }
    return;
  }

  if (!isFlatColor(colorName)) {
    throw new Error(
      `Invalid color name "${colorName}". ` +
        `Valid flat colors: ${FLAT_COLOR_KEYS.join(', ')}. ` +
        `Valid grammar colors start with 'grammar.'. ` +
        `This indicates a bug in the word analysis logic that must be fixed.`,
    );
  }
}
