/**
 * Positional Scoring Constants
 *
 * Used by the color-coding system to resolve overlapping component matches.
 * When multiple components could match the same text position, these scores
 * determine which match wins based on component type and position in the text.
 *
 * Higher scores = higher priority in overlap resolution.
 */

/**
 * Positional scoring weights for different component types and positions
 */
export const POSITIONAL_SCORE = {
  /**
   * Bracket injection ([the]) gets highest priority
   * Rationale: Brackets are explicit educational markers added by the system
   * to show definite article presence. They should always be displayed.
   */
  BRACKET_INJECTION: 2.0,

  /**
   * Prefix at start of text scores 1.0 (optimal position)
   * Suffix at end of text scores 1.0 (optimal position)
   * Rationale: Components in their natural positions are most likely correct.
   */
  OPTIMAL_POSITION: 1.0,

  /**
   * Neutral score for components in non-ideal positions
   * Used for:
   * - Prefixes not at start (scores decline linearly toward text end)
   * - Suffixes not at end (scores incline linearly toward text end)
   * - Infixes/diacritics (can appear anywhere, no positional bias)
   */
  NEUTRAL: 0.5,

  /**
   * Minimum score (prefix at end or suffix at start)
   */
  MIN: 0.0,
} as const;

/**
 * Special component type for bracket injection ([the])
 * Only used in positional scoring - other types use ComponentType enum directly
 */
export const BRACKET_TYPE = 'bracket' as const;
