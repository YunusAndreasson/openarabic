/**
 * Constants and configuration for Arabic word analysis
 */

/**
 * Pre-compiled regex for Arabic diacritical marks (for .replace() operations)
 *
 * Includes:
 * - \u064B-\u065F: Arabic diacritics (fatha, kasra, damma, tanween, sukun, shadda, etc.)
 * - \u0670: Arabic letter superscript alef
 * - \u06D6-\u06ED: Arabic small high ligature sad/qaf/alef, etc.
 *
 * Excludes:
 * - \u06EE-\u06EF: Letterforms (not diacritics)
 * - \u06FA-\u06FF: Extended Arabic letters (not diacritics)
 *
 * Note: Uses /g flag for .replace() to remove ALL diacritics.
 */
export const DIACRITIC_REGEX_GLOBAL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/**
 * Non-global version of diacritic regex for .test() operations
 * The /g flag causes stateful behavior that breaks consecutive .test() calls.
 */
export const DIACRITIC_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

/**
 * Unicode formatting characters that should be stripped during normalization
 *
 * Includes:
 * - \u200B: Zero-width space
 * - \u200C: Zero-width non-joiner
 * - \u200D: Zero-width joiner
 * - \u200E: Left-to-right mark
 * - \u200F: Right-to-left mark
 * - \u202A-\u202E: Directional formatting characters
 * - \uFEFF: Zero-width no-break space (BOM)
 */
export const UNICODE_FORMAT_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

export const NON_WORD_REGEX = /[^\w\s]/g;
export const WHITESPACE_REGEX = /\s+/;

/** Maximum cache size for LRU eviction */
export const CACHE_SIZE_LIMIT = 500;

/**
 * Validation configuration - single source of truth for all validation rules
 */
export const VALIDATION_CONFIG = {
  /** Arabic letters that are often vowels (weak letters), excluded from consonant count */
  WEAK_LETTERS: ['ا', 'و', 'ي'] as const,

  /** Single-letter prefixes that require structural validation to avoid false positives */
  // Note: 'ن' included - with HIDDEN_PREFIX_MIN_LENGTH=3, it prevents false positives (نزه)
  // while still allowing valid cases (نفسه where ن+ف+س = 3 chars)
  SUBJECT_MARKERS: ['ي', 'ت', 'ن', 'أ'] as const,

  /** High-risk single-letter prepositions that often appear in morphological patterns */
  // م appears in مَفْعَل nouns (مذهب، مسجد، مطبخ) and should rarely be split
  // Only valid in grammatical contractions like مِمَّن (من + من)
  HIGH_RISK_PREPOSITIONS: ['م'] as const,

  /** High-risk suffix patterns that require validation (common as root letters) */
  HIGH_RISK_SUFFIXES: ['ه', 'ها', 'ي', 'ك'] as const,

  /** Known prepositions that end in ي when taking pronoun suffixes (علي، لدي، إلي) */
  PREPOSITIONS_WITH_SUFFIXES: ['علي', 'لدي', 'إلي'] as const,

  /** Minimum validation thresholds for prefix detection */
  PREFIX_VALIDATION: {
    MIN_REMAINING_LENGTH: 3,
    MIN_CONSONANTS: 2,
  } as const,

  /** Minimum validation thresholds for suffix detection */
  SUFFIX_VALIDATION: {
    MIN_REMAINING_LENGTH: 2, // Allow 2-letter roots (رب, يد, دم, فم, etc.)
    MIN_CONSONANTS_3PLUS: 2, // For 3+ char roots, require 2 consonants
    MIN_CONSONANTS_2CHAR: 1, // For 2-char roots, require only 1 consonant (allows يد, فم)
    /** Extra length required if remaining starts with subject marker (accounts for prefix + 2-char root, including shadda cases) */
    HIDDEN_PREFIX_MIN_LENGTH: 3,
  } as const,

  /** Future tense prefixes that indicate verb conjugation */
  FUTURE_TENSE_PREFIXES: ['س', 'سوف'] as const,

  /** Negation prefixes */
  NEGATION_PREFIXES: ['لا', 'لم', 'لن'] as const,
} as const;

/**
 * Standalone pronouns that should not be treated as roots in pure particle combinations
 *
 * These are independent pronouns (subject/object) that, when combined with only a
 * conjunction/particle prefix (و، ف، etc.), create pure particle combinations
 * that provide no compositional insight.
 *
 * Examples of what SHOULD NOT be colored:
 *   - وَهُوَ = و (and) + هُوَ (he) → pure particles, no root-based word
 *   - فَهِيَ = ف (then) + هِيَ (she) → pure particles, no root-based word
 *
 * Note: These pronouns ARE colored when attached to prepositions or with suffixes:
 *   - بِهِ = ب (with) + ه (him) → shows preposition + pronoun attachment ✓
 *   - هُوَ + suffix would be colored ✓
 */
export const STANDALONE_PRONOUNS = ['هو', 'هي', 'هم', 'هن', 'هما', 'انتم', 'انتن', 'انتما', 'نحن'];
