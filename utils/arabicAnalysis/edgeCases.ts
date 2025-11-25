/**
 * Edge case handlers for Arabic word analysis
 */

import { GrammaticalRole } from '@/constants/arabicWordComponents';

import { STANDALONE_PRONOUNS } from './constants';
import type { AnalyzedComponent } from './types';

/**
 * Check if this is a pure particle combination with no compositional root
 *
 * Pure particle combinations are conjunctions/particles + pronouns with no root-based word.
 * These provide no educational value when colored.
 *
 * @param prefixes - Detected prefixes
 * @param remaining - Remaining text after removing components
 * @returns true if this is a pure particle combination that should not be colored
 */
export function isPureParticleCombination(
  prefixes: AnalyzedComponent[],
  remaining: string,
): boolean {
  // Only check if we have exactly 1 prefix and no suffix/infix
  if (prefixes.length !== 1) {
    return false;
  }

  const prefix = prefixes[0];
  if (!prefix) {
    return false;
  }

  // Check if remaining text is a standalone pronoun
  const remainingNormalized = remaining.trim();
  if (STANDALONE_PRONOUNS.includes(remainingNormalized)) {
    // Check if prefix is a conjunction or particle (و، ف، etc.)
    // These roles indicate pure particles, not prepositions
    const isConjunctionOrParticle =
      prefix.role === GrammaticalRole.CONJUNCTION || prefix.role === GrammaticalRole.PARTICLE;

    if (isConjunctionOrParticle) {
      // This is a pure particle combination (conjunction + pronoun)
      // Example: و + هو = "and he" (no root-based word)
      return true;
    }
  }

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
    if (prefix?.arabicMatch === normalizedArabic) {
      // Single prefix consuming entire word → no composition to show → skip coloring
      return true;
    }
  }

  // If we have a suffix/infix/diacritic as the only component, this means there's an implied root
  // (e.g., "كتاب" + suffix "ه" = composition) → keep coloring
  return false;
}
