/**
 * Edge case handlers for Arabic word analysis
 */

import { normalizeArabic } from './normalization';
import type { AnalyzedComponent } from './types';

/**
 * Check if this is a pure particle combination with no compositional root
 *
 * UPDATED: This filter is now disabled.
 *
 * Core principle: If there are 2 English words AND 2 Arabic parts, we SHOULD color it
 * to show the composition, regardless of whether they're "particles" or not.
 *
 * Examples that SHOULD be colored:
 *   - وهو "and he" - و (and) + هو (he) = 2 parts → COLOR IT ✓
 *   - فهو "so it" - ف (so) + هو (it) = 2 parts → COLOR IT ✓
 *   - ولا "and not" - و (and) + لا (not) = 2 parts → COLOR IT ✓
 *
 * The composition itself is educational, even if both parts are particles/pronouns.
 *
 * @param prefixes - Detected prefixes (unused now)
 * @param remaining - Remaining text after removing components (unused now)
 * @returns false - this filter is disabled
 */
export function isPureParticleCombination(
  _prefixes: AnalyzedComponent[],
  _remaining: string,
): boolean {
  // DISABLED: Always return false to allow all compositions to be colored
  // The core principle is: if there are 2 parts, show them with colors
  return false;
}

/**
 * Check if analysis result represents a single standalone component with no compositional structure
 *
 * Core principle: Color-coding is educational when it shows how Arabic words are COMPOSED
 * from multiple grammatical components. Single-component words show no composition.
 *
 * Examples that SHOULD be skipped (hasComponents=false):
 *   - "لا → that does not" - single component, no composition to show
 *   - "بل → but rather" - single component, no composition to show
 *   - "ثم → then" - single component, no composition to show
 *   - "من → who" - single component, no composition to show
 *
 * Examples that SHOULD be colored (hasComponents=true):
 *   - "فإذا → so when" - 2 prefixes (ف + إذا), shows composition ✓
 *   - "والله → and by Allah" - prefix + remaining root, shows composition ✓
 *   - "كتابه → his book" - root + suffix, shows composition ✓
 *   - "كِتَابٌ → book" - has diacritic, shows case marking ✓
 *   - "ولا → and not" - 2 prefixes, shows composition ✓
 *
 * What matters: Arabic composition (multiple components), not English complexity or grammatical roles.
 *
 * @param analysis - The completed word analysis
 * @param normalizedArabic - The normalized Arabic word (for comparison)
 * @returns true if this is a single standalone component with no composition to show
 */
export function isSingleStandaloneComponent(
  analysis: {
    prefixes: AnalyzedComponent[];
    suffix?: AnalyzedComponent;
    infix?: AnalyzedComponent;
    diacritic?: AnalyzedComponent;
  },
  normalizedArabic: string,
): boolean {
  // Must have exactly 1 component (prefix, suffix, infix, or diacritic) and nothing else
  const componentCount =
    analysis.prefixes.length +
    (analysis.suffix ? 1 : 0) +
    (analysis.infix ? 1 : 0) +
    (analysis.diacritic ? 1 : 0);

  if (componentCount !== 1) {
    return false; // Multiple components → shows composition → keep coloring
  }

  // If we have exactly 1 prefix, it must consume the entire word (no remaining root)
  if (analysis.prefixes.length === 1) {
    const prefix = analysis.prefixes[0];
    if (normalizeArabic(prefix?.arabicMatch ?? '') === normalizedArabic) {
      // Single prefix consuming entire word → no composition to show → skip coloring
      return true;
    }
  }

  // If we have a suffix/infix/diacritic as the only component, this means there's an implied root
  // (e.g., "كتاب" + suffix "ه" = composition) → keep coloring
  return false;
}
