/**
 * Validation Constants for Arabic Word Analysis
 *
 * Centralized thresholds and limits used throughout the component detection
 * and validation logic. These constants prevent false positive detections
 * while maintaining high accuracy for legitimate components.
 *
 * Each constant includes rationale explaining why that specific threshold was chosen.
 */

/**
 * Minimum remaining text length thresholds
 * These prevent detecting components when the remaining text is too short to be a valid root
 */
export const MIN_REMAINING_LENGTH = {
  /**
   * Minimum root length for high-risk suffix validation
   *
   * Rationale: Arabic roots are typically 3+ letters. If removing a high-risk suffix
   * (ה, הא, י, כ) leaves < 3 chars, it's likely a false positive where the "suffix"
   * is actually part of the root.
   *
   * Examples:
   * - "כרה" → "he hates" - removing ה leaves "כר" (2 chars) = FALSE POSITIVE
   * - "כתבה" → "he wrote it" - removing ה leaves "כתב" (3 chars) = VALID
   */
  HIGH_RISK_SUFFIX: 3,

  /**
   * Minimum root length for subject marker validation
   *
   * Rationale: When a subject marker prefix (ي/ת/ن/أ) is detected and remaining
   * is ≤ 3 chars, check if English contains subject pronoun. Short remaining text
   * makes it more likely the "marker" is actually a root letter.
   *
   * Examples:
   * - "يوم" → "day" - ي looks like subject marker but no "he" in English = FALSE POSITIVE
   * - "يكتب" → "he writes" - ي is subject marker, "he" in English = VALID
   */
  SUBJECT_MARKER: 3,

  /**
   * Minimum root length after prefix detection
   *
   * Rationale: After removing prefixes, remaining text should be ≥ 3 chars
   * to be considered a valid root. Shorter remainders suggest over-aggressive
   * prefix detection.
   *
   * Note: This is a soft threshold - some valid prefix+suffix compounds may have
   * 0-2 char remainders (e.g., "מנא" = "from what" = preposition + interrogative).
   */
  AFTER_PREFIX: 3,

  /**
   * Minimum text length for infix detection
   *
   * Rationale: Infixes appear within roots. Text must be > 2 chars to potentially
   * contain an infix (at least 1 char before + infix + 1 char after).
   */
  INFIX_DETECTION: 2,

  /**
   * Maximum remaining length for prefix-only detection
   *
   * Rationale: When remaining text after prefix is ≤ 1 char, the word is likely
   * a standalone prefix/particle with no root. Used in prefix validation to prevent
   * false prefix detection on actual roots.
   */
  PREFIX_ONLY: 1,
} as const;

/**
 * Overlap resolution thresholds
 * Used when prefix and suffix both match, and we need to decide which to keep
 */
export const OVERLAP_REJECTION = {
  /**
   * Critical remaining length for overlap rejection
   *
   * Rationale: If prefix and suffix overlap and removing the suffix would leave
   * exactly 2 chars of remaining text, this is likely a false positive suffix.
   * Real roots are typically 3+ chars.
   *
   * Examples:
   * - "يכרה" → "he hates" - prefix ي + suffix ה overlap, removing ה leaves "כר" (2 chars)
   *   → Reject suffix as false positive
   * - "يכתבה" → "he wrote it" - removing ה leaves "כתב" (3 chars) → Keep suffix
   *
   * Exception: If remaining is 0-1 chars, allow it (valid prefix+suffix compound
   * with no root, like "מנא" = "from what").
   */
  CRITICAL_LENGTH: 2,
} as const;

/**
 * Word count thresholds for single-word rule
 */
export const WORD_COUNT = {
  /**
   * Single-word threshold for color-coding
   *
   * Rationale: Educational principle - single English words should never have
   * grammar color-coding applied. Color-coding is only valuable when showing
   * how multi-word phrases are constructed from Arabic components.
   *
   * Examples:
   * - "book" (1 word) → NO color-coding ✗
   * - "his book" (2 words) → Color "his" to show possessive suffix ✓
   */
  SINGLE: 1,
} as const;

