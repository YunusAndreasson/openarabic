import {
  ARABIC_DIACRITICS,
  ARABIC_INFIXES,
  ARABIC_PREFIXES,
  ARABIC_SUFFIXES,
  COMPONENT_TYPE_CONFIG,
  ComponentType,
  GRAMMATICAL_ROLE_COLORS,
  GrammaticalRole,
  type WordComponent,
} from '@/constants/arabicWordComponents';
import { CONTRACTION_MAP } from '@/constants/contractions';
import type { ColoredSegment } from '@/types/vocabulary.types';

// React Native global for development mode detection
declare const __DEV__: boolean;

export interface AnalyzedComponent {
  component: WordComponent;
  arabicMatch: string;
  englishMatches: string[];
  matchedInEnglish: boolean;
  /** If set, this component should inherit the color from the specified component type */
  inheritColorFrom?: ComponentType;
  /** Grammatical role for educational color differentiation (e.g., conjunction vs. article) */
  role?: GrammaticalRole;
  /** Position in sequence for ordered components (e.g., prefix[0], prefix[1]) */
  position?: number;
}

export interface WordAnalysis {
  original: {
    arabic: string;
    english: string;
  };
  prefixes: AnalyzedComponent[]; // Changed from prefix?: AnalyzedComponent to support multiple prefixes
  infix?: AnalyzedComponent;
  suffix?: AnalyzedComponent;
  diacritic?: AnalyzedComponent;
  hasComponents: boolean;
  remainingArabic: string;
  remainingEnglish: string;
  hasBracketInjection?: boolean;
}

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
const DIACRITIC_REGEX_GLOBAL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/**
 * Non-global version of diacritic regex for .test() operations
 * The /g flag causes stateful behavior that breaks consecutive .test() calls.
 */
const DIACRITIC_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

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
const UNICODE_FORMAT_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

const NON_WORD_REGEX = /[^\w\s]/g;
const WHITESPACE_REGEX = /\s+/;

// Separate caches for Arabic and English normalization to avoid contention
const ARABIC_NORMALIZATION_CACHE = new Map<string, string>();
const ENGLISH_NORMALIZATION_CACHE = new Map<string, string>();
const ANALYSIS_CACHE = new Map<string, WordAnalysis>();
const CACHE_SIZE_LIMIT = 500; // Increased from 100 for better performance with common words

/**
 * Clear all analysis caches - useful for testing or after updating component definitions
 */
export function clearAnalysisCache(): void {
  ANALYSIS_CACHE.clear();
  ARABIC_NORMALIZATION_CACHE.clear();
  ENGLISH_NORMALIZATION_CACHE.clear();
}

/**
 * Cache helper with LRU (Least Recently Used) eviction strategy
 * Evicts the oldest entry when cache size reaches the limit
 */
function cacheWithLRUEviction<K, V>(
  cache: Map<K, V>,
  key: K,
  value: V,
  limit: number = CACHE_SIZE_LIMIT,
): void {
  if (cache.size >= limit) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, value);
}

/**
 * Validation configuration - single source of truth for all validation rules
 */
const VALIDATION_CONFIG = {
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
} as const;

/**
 * Validation helper functions - reusable building blocks for structural validation
 */

/**
 * Check if a character is a weak letter (often used as vowel in Arabic)
 */
function isWeakLetter(char: string): boolean {
  return VALIDATION_CONFIG.WEAK_LETTERS.includes(
    char as (typeof VALIDATION_CONFIG.WEAK_LETTERS)[number],
  );
}

/**
 * Count consonants in Arabic text (excluding weak letters ا، و، ي)
 */
function countConsonants(text: string): number {
  return text.split('').filter(ch => !isWeakLetter(ch)).length;
}

/**
 * Check if text has substantial structure (minimum length and consonants)
 * Used to distinguish roots from affixes
 */
function hasSubstantialStructure(text: string, minLength: number, minConsonants: number): boolean {
  return text.length >= minLength && countConsonants(text) >= minConsonants;
}

/**
 * Check if a pattern is a subject marker prefix (ي، ت، ن، أ)
 */
function isSubjectMarker(pattern: string): boolean {
  return VALIDATION_CONFIG.SUBJECT_MARKERS.includes(
    pattern as (typeof VALIDATION_CONFIG.SUBJECT_MARKERS)[number],
  );
}

/**
 * Check if a pattern is a high-risk suffix requiring validation
 */
function isHighRiskSuffix(pattern: string): boolean {
  return VALIDATION_CONFIG.HIGH_RISK_SUFFIXES.includes(
    pattern as (typeof VALIDATION_CONFIG.HIGH_RISK_SUFFIXES)[number],
  );
}

/**
 * Check if a pattern is a high-risk preposition requiring validation
 */
function isHighRiskPreposition(pattern: string): boolean {
  return VALIDATION_CONFIG.HIGH_RISK_PREPOSITIONS.includes(
    pattern as (typeof VALIDATION_CONFIG.HIGH_RISK_PREPOSITIONS)[number],
  );
}

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
const STANDALONE_PRONOUNS = ['هو', 'هي', 'هم', 'هن', 'هما', 'انتم', 'انتن', 'انتما', 'نحن'];

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
function isPureParticleCombination(prefixes: AnalyzedComponent[], remaining: string): boolean {
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
function isSingleStandaloneComponent(
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

/**
 * Normalizes Arabic text by removing diacritics and Unicode formatting characters (with caching)
 *
 * Performs the following transformations:
 * 1. Converts alef wasla (ٱ) to regular alef (ا)
 * 2. Removes Unicode formatting characters (RTL marks, zero-width spaces, etc.)
 * 3. Removes all Arabic diacritical marks
 * 4. Trims whitespace
 *
 * Results are cached for performance.
 *
 * @param text - Arabic text to normalize
 * @returns Normalized Arabic text without diacritics or formatting characters
 * @example normalizeArabic("ٱلْكِتَابُ") → "الكتاب"
 */
export function normalizeArabic(text: string): string {
  const cached = ARABIC_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // Normalize alef wasla (ٱ U+0671) to regular alef (ا U+0627)
  // Alef wasla is an orthographic variant used for the definite article
  // and should be treated as regular alef for analysis purposes
  let normalized = text.replace(/ٱ/g, 'ا');

  // Remove Unicode formatting characters (RTL marks, zero-width characters, etc.)
  // then remove diacritics, then trim
  normalized = normalized
    .replace(UNICODE_FORMAT_REGEX, '')
    .replace(DIACRITIC_REGEX_GLOBAL, '')
    .trim();

  cacheWithLRUEviction(ARABIC_NORMALIZATION_CACHE, text, normalized);

  return normalized;
}

/**
 * Normalizes English text for comparison (with caching)
 */
function normalizeEnglish(text: string): string {
  const cached = ENGLISH_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = text.toLowerCase().replace(NON_WORD_REGEX, '').trim();

  cacheWithLRUEviction(ENGLISH_NORMALIZATION_CACHE, text, normalized);

  return normalized;
}

/**
 * Expands contractions in English text BEFORE normalization
 * This preserves apostrophes for contraction lookup before they're removed
 *
 * @param text - English text that may contain contractions
 * @returns Text with contractions expanded (e.g., "don't know" → "do not know")
 */
function expandContractions(text: string): string {
  let expanded = text.toLowerCase();

  // Replace each contraction with its expanded form
  for (const [contraction, expansion] of Object.entries(CONTRACTION_MAP)) {
    // Use word boundary regex to avoid partial matches
    const regex = new RegExp(`\\b${contraction}\\b`, 'g');
    expanded = expanded.replace(regex, expansion);
  }

  return expanded;
}

/**
 * Determines if a pattern should be rejected because it matches the entire translation
 *
 * Rules:
 * 1. Single-word translations: always allow (e.g., 'و' → 'and')
 * 2. Multi-word translations with standalone particle: allow if component = entire Arabic word (e.g., 'لم' → 'does not')
 * 3. Multi-word translations with compound word: reject whole-translation matches (defeats educational purpose)
 *
 * @param candidate - The normalized candidate pattern
 * @param normalizedEnglish - The normalized English translation
 * @param tokenCount - Number of words in the English translation
 * @param arabicWord - The original Arabic word (optional)
 * @param componentPattern - The Arabic component pattern (optional)
 * @returns true if the pattern should be rejected
 */
function shouldRejectWholeTranslationMatch(
  candidate: string,
  normalizedEnglish: string,
  tokenCount: number,
  arabicWord?: string,
  componentPattern?: string,
): boolean {
  // Rule 1: Single-word translations always allowed
  if (tokenCount === 1) {
    return false;
  }

  // Only apply rejection for whole-translation matches in multi-word phrases
  if (candidate !== normalizedEnglish) {
    return false;
  }

  // Rule 2: Check if this is a standalone particle (component = entire Arabic word)
  if (arabicWord && componentPattern) {
    const normalizedArabic = normalizeArabic(arabicWord);
    const isStandaloneParticle = normalizedArabic.length === componentPattern.length;

    // Allow standalone particles (e.g., 'لم' where the prefix IS the word)
    // Reject compound words (e.g., 'والبيت' where 'و' is just a prefix)
    return !isStandaloneParticle;
  }

  // Rule 3: No Arabic context provided - reject whole-translation matches by default
  return true;
}

/**
 * Optimized function to check if English contains any patterns
 */
function hasEnglishMatch(
  english: string,
  patterns: string[],
  arabicWord?: string,
  componentPattern?: string,
): string[] {
  // Expand contractions BEFORE normalization to preserve apostrophes for lookup
  const expandedEnglish = expandContractions(english);
  const norm = normalizeEnglish(expandedEnglish);
  const tokens = norm.split(WHITESPACE_REGEX).filter(Boolean);

  // Build unigram set for fast membership checks
  const unigrams = new Set(tokens);
  let bigrams: Set<string> | null = null;
  let trigrams: Set<string> | null = null;

  const matches: string[] = [];
  for (const raw of patterns) {
    // Normalize the pattern for matching
    const candidate = normalizeEnglish(raw);

    // Check if we should reject this whole-translation match
    if (
      shouldRejectWholeTranslationMatch(
        candidate,
        norm,
        tokens.length,
        arabicWord,
        componentPattern,
      )
    ) {
      continue;
    }

    if (candidate.includes(' ')) {
      // Lazily build bigrams/trigrams when needed
      if (bigrams === null || trigrams === null) {
        bigrams = new Set(
          tokens
            .map((_, i) => (i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : ''))
            .filter(Boolean),
        );
        trigrams = new Set(
          tokens
            .map((_, i) =>
              i + 2 < tokens.length ? `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}` : '',
            )
            .filter(Boolean),
        );
      }
      // Explicit null checks for TypeScript
      if (bigrams !== null && trigrams !== null) {
        if (bigrams.has(candidate) || trigrams.has(candidate)) {
          matches.push(raw);
        }
      }
    } else {
      if (unigrams.has(candidate)) {
        matches.push(raw);
      }
    }
  }

  return matches;
}

/**
 * Unified function to find components (prefix, infix, suffix, or diacritic)
 */
function findComponent(
  arabic: string,
  english: string,
  components: WordComponent[],
  type: ComponentType,
): AnalyzedComponent | undefined {
  let best: AnalyzedComponent | undefined;

  for (const component of components) {
    const pattern = component.arabic;

    // Check if pattern matches based on type
    let matches = false;
    if (type === ComponentType.PREFIX) {
      matches = arabic.startsWith(pattern);
    } else if (type === ComponentType.SUFFIX) {
      matches = arabic.endsWith(pattern);
    } else if (type === ComponentType.INFIX) {
      // For infixes, check if pattern exists within the word (not at start/end)
      const index = arabic.indexOf(pattern);
      matches = index > 0 && index < arabic.length - pattern.length;
      // Additional precision for Form X seeking/requesting infix "ست": require preceding 'ا'
      if (matches && pattern === 'ست') {
        const preceding = index > 0 ? arabic[index - 1] : '';
        if (preceding !== 'ا') {
          matches = false;
        }
      }
    } else if (type === ComponentType.DIACRITIC) {
      // For diacritics, work with original text (not normalized) and check for pattern at end
      matches = arabic.trim().endsWith(pattern);
    }

    /**
     * Heuristic disambiguation for very short subject markers to avoid false positives
     *
     * Problem: Single-letter prefixes (ي، ت، أ، ن) are very common in Arabic and can create false matches
     * Solution: Require remaining word to have minimum structure:
     *   - At least 3 characters long
     *   - At least 2 consonants (excluding ا، و، ي which are often vowels)
     *
     * Example:
     *   - "يكتب" (he writes) ✓ passes: remaining "كتب" has length 3 and consonants ك، ت، ب
     *   - "يد" (hand) ✗ fails: remaining "د" too short
     */
    if (matches && type === ComponentType.PREFIX) {
      if (isSubjectMarker(pattern)) {
        const remaining = arabic.slice(pattern.length);
        if (
          !hasSubstantialStructure(
            remaining,
            VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_REMAINING_LENGTH,
            VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_CONSONANTS,
          )
        ) {
          matches = false;
        }
      }

      /**
       * Validation for high-risk single-letter prepositions (م) to prevent morphological false positives
       *
       * Problem: "م" appears in:
       *   1. Grammatical contractions: مِمَّا (من + ما) = "from what" ✓ VALID (rare)
       *   2. Morphological patterns: مَذْهَب، مَسْجِد، مَطْبَخ ✗ INVALID to split (common)
       *
       * The "م" in morphological patterns is structural (part of noun formation via مَفْعَل/مَفْعُول patterns),
       * not grammatical (separate function word). These should NEVER be split.
       *
       * Solution: Apply strict validation with exception for known particle combinations:
       *   - ALLOW: If remaining is a known particle (ما، من، etc.) - legitimate contraction
       *   - OTHERWISE: Remaining must be >= 3 characters + >= 2 consonants
       *   - This catches morphological patterns while allowing rare legitimate contractions
       *
       * Examples:
       *   - "مما" → remaining "ما" (2 chars) → "ما" is a particle → ALLOW (contraction)
       *   - "مذهب" → remaining "ذهب" (3 chars) → "ذهب" is a root, not particle → check further
       *     → "school of thought" has "of" mid-phrase → REJECT in detectPrefixes()
       *   - "مسجد" → remaining "سجد" (3 chars) → "سجد" is a root → check further
       *     → "mosque" has no "of" → REJECT (no English match)
       *
       * Note: Additional English validation (mid-phrase "of" detection) happens in detectPrefixes()
       * after this function returns, to filter out idioms like "school of thought".
       */
      if (isHighRiskPreposition(pattern)) {
        const remaining = arabic.slice(pattern.length);

        // Exception: Allow م before known particles (مما = من + ما, etc.)
        // These are legitimate grammatical contractions, not morphological patterns
        const knownParticles = ['ما', 'من', 'ن']; // Particles that can follow م in contractions
        const isParticleCombination = knownParticles.includes(remaining);

        if (!isParticleCombination) {
          // Not a known particle combination - require substantial remaining structure
          // Most morphological م patterns will pass this but fail English validation later
          if (
            !hasSubstantialStructure(
              remaining,
              VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_REMAINING_LENGTH,
              VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_CONSONANTS,
            )
          ) {
            matches = false;
          }
        }
      }
    }

    /**
     * Root structure validation for suffixes to avoid false positives
     *
     * Problem: Suffix patterns can match root letters (e.g., ه in وجه "face" vs كتابه "his book")
     * Solution: Validate that removing suffix leaves substantial word structure:
     *   - At least 3 characters remaining (distinguishes root from suffix)
     *   - At least 2 consonants (excluding ا، و، ي which are often vowels)
     *   - Special pattern detection for فعيل (fa'īl) adjectival forms ending in root ه
     *   - Exception: Allow prefix+suffix combinations (e.g., له، بك، وه)
     *
     * High-risk suffixes requiring validation:
     *   - ه (he, his, it) - extremely common as root letter (و-ج-ه, ف-ق-ه, ك-ر-ه)
     *   - ها (her, its) - common in feminine patterns
     *   - ي (my) - appears in nisba adjectives (مصري, عربي)
     *   - ك (your) - less common but still possible
     *
     * Examples:
     *   - "كره" (hate, root ك-ر-ه) ✗ fails: remaining "كر" only 2 chars
     *   - "وجه" (face, root و-ج-ه) ✗ fails: remaining "وج" only 1 consonant
     *   - "سفيه" (foolish, root س-ف-ه) ✗ fails: فعيل pattern detected
     *   - "كتابه" (his book) ✓ passes: remaining "كتاب" is 4 chars with 3 consonants
     *   - "بيته" (his house) ✓ passes: remaining "بيت" is 3 chars with 3 consonants
     *   - "له" (for him) ✓ passes: special case - prefix ل + suffix ه
     */
    if (matches && type === ComponentType.SUFFIX) {
      // Only apply validation to high-risk single/double letter suffixes
      if (isHighRiskSuffix(pattern)) {
        const remaining = arabic.slice(0, arabic.length - pattern.length);

        // Special case: prefix + suffix with no root (e.g., له، بك، وه)
        // Or standalone suffix (e.g., single letter ه)
        // Only allow for single-character prefixes or empty (standalone suffix)
        // Two-character remainders (كر، وج، نز) are root remnants, not prefix-only
        const isLikelyPrefixOnly = remaining.length <= 1;

        if (!isLikelyPrefixOnly) {
          // Apply validation for words with roots (3+ chars remaining)

          // Additional check: If remaining starts with a SUBJECT MARKER, it may have a hidden prefix
          // Example: يسره → remove ه → يسر (3 chars starting with ي = prefix + 2-char root with potential shadda)
          // Example: نزه → remove ه → نز (2 chars starting with ن = would be invalid, ن is part of root)
          // NOTE: Only check subject markers (ي، ت، ن، أ) which are rarely root-initial
          // Don't check ل، ب، ك، و، ف which commonly appear in roots (e.g., لذة، بذر، كره)
          const startsWithSubjectMarker = isSubjectMarker(remaining.charAt(0));

          // Check if English contains possessive pronouns indicating noun + possessive suffix
          // Example: "يدي" = "my hand" → possessive pronoun "my" indicates noun, not verb
          const possessivePronouns = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
          const englishWords = english.toLowerCase().split(/\s+/);
          const hasPossessivePronoun = englishWords.some(word => possessivePronouns.includes(word));

          // Hidden prefix check: length must be exactly 3 (prefix + 2-char root) OR 2 (too short, reject)
          // BUT: If English has possessive pronoun, it's a noun with possessive suffix, not verb
          const hasHiddenPrefix =
            startsWithSubjectMarker && remaining.length <= 3 && !hasPossessivePronoun;

          // Minimum length check: need at least 2 characters for legitimate suffix attachment
          // OR 3+ if it starts with a prefix letter (to account for prefix + 2-char root, including shadda cases like سرّ)
          // This allows 2-letter roots like رب (Lord), يد (hand), دم (blood), فم (mouth), and shadda-doubled roots
          const minLengthRequired = hasHiddenPrefix
            ? VALIDATION_CONFIG.SUFFIX_VALIDATION.HIDDEN_PREFIX_MIN_LENGTH
            : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_REMAINING_LENGTH;

          const minLengthSatisfied = remaining.length >= minLengthRequired;

          // Smart consonant validation: 2-char roots need only 1 consonant, 3+ need 2
          // This allows both "رب" (2 consonants) and "يد" (1 consonant) as valid roots
          // EXCEPTION: If English has possessive pronoun, we KNOW it's noun + possessive suffix
          // So relax consonant requirement to allow weak-letter roots like "يوم" (day) in "يومك" (your day)
          const minConsonantsRequired =
            remaining.length === 2
              ? VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_2CHAR
              : hasPossessivePronoun
                ? VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_2CHAR // Relax to 1 for possessive
                : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_3PLUS;
          const hasEnoughConsonants = countConsonants(remaining) >= minConsonantsRequired;

          // فعيل pattern detection: words like سفيه، كريه (root ends in ه with ي before it)
          // Pattern: C¹ C² ي ه → likely فعيل adjectival form where ه is root letter
          // Exception: Don't apply to known prepositions that take suffixes (على، لدى، إلى)
          const potentialFa3eelPattern =
            pattern === 'ه' && remaining.length === 3 && remaining.charAt(2) === 'ي';

          // Check if remaining is a known preposition ending in ى that takes suffixes
          const isKnownPreposition = (
            VALIDATION_CONFIG.PREPOSITIONS_WITH_SUFFIXES as readonly string[]
          ).includes(remaining);

          // Only reject as فعيل if it's not a known preposition
          const isFa3eelPattern = potentialFa3eelPattern && !isKnownPreposition;

          if (!minLengthSatisfied || !hasEnoughConsonants || isFa3eelPattern) {
            matches = false;
          }
        }
        // If isLikelyPrefixOnly, allow the suffix (don't set matches = false)
      }
    }

    if (matches) {
      const englishMatches = hasEnglishMatch(english, component.english, arabic, pattern);
      if (englishMatches.length > 0 && (!best || pattern.length > best.arabicMatch.length)) {
        best = {
          component,
          arabicMatch: pattern,
          englishMatches,
          matchedInEnglish: true,
          role: component.role, // Copy role from component definition for color-coding
        };
      }
    }
  }

  return best;
}

/**
 * Overlap resolution for prefix and suffix - keeps the longer component
 * Note: Infixes are found AFTER prefix/suffix removal, so no infix overlap is possible by design
 */
function resolveOverlap(
  normalized: string,
  prefix: AnalyzedComponent | undefined,
  suffix: AnalyzedComponent | undefined,
): {
  resolvedPrefix: AnalyzedComponent | undefined;
  resolvedSuffix: AnalyzedComponent | undefined;
} {
  if (!prefix || !suffix) {
    return { resolvedPrefix: prefix, resolvedSuffix: suffix };
  }

  const prefixEnd = prefix.arabicMatch.length;
  const suffixStart = normalized.length - suffix.arabicMatch.length;

  // If they overlap, keep the longer one
  if (prefixEnd > suffixStart) {
    return prefix.arabicMatch.length >= suffix.arabicMatch.length
      ? { resolvedPrefix: prefix, resolvedSuffix: undefined }
      : { resolvedPrefix: undefined, resolvedSuffix: suffix };
  }

  return { resolvedPrefix: prefix, resolvedSuffix: suffix };
}

/**
 * Finds infix components in the remaining text after prefix/suffix removal
 * Filters out infixes whose English patterns are already claimed by prefix/suffix
 */
function findInfix(
  remainingArabic: string,
  english: string,
  prefixes: AnalyzedComponent[],
  suffix?: AnalyzedComponent,
): AnalyzedComponent | undefined {
  const result = findComponent(remainingArabic, english, ARABIC_INFIXES, ComponentType.INFIX);

  // Filter out false positives: infix matches that are already claimed by prefixes/suffix
  if (result) {
    const claimedWords = new Set<string>();

    // Collect all English words claimed by all prefixes
    prefixes.forEach(prefix => {
      prefix.englishMatches.forEach(match => {
        match
          .toLowerCase()
          .split(/\s+/)
          .forEach(word => claimedWords.add(word));
      });
    });

    // Collect all English words claimed by suffix
    if (suffix) {
      suffix.englishMatches.forEach(match => {
        match
          .toLowerCase()
          .split(/\s+/)
          .forEach(word => claimedWords.add(word));
      });
    }

    // Check if ALL infix English matches are already claimed
    const allClaimed = result.englishMatches.every(match =>
      match
        .toLowerCase()
        .split(/\s+/)
        .every(word => claimedWords.has(word)),
    );

    if (allClaimed) {
      // All English patterns already claimed - this is a false positive
      return undefined;
    }
  }

  return result;
}

/**
 * Finds diacritic components in the original text (before normalization)
 */
function findDiacritic(arabic: string, english: string): AnalyzedComponent | undefined {
  return findComponent(arabic, english, ARABIC_DIACRITICS, ComponentType.DIACRITIC);
}

/**
 * Determines if bracket injection ([the]) should be applied for definite article
 * Shared logic to avoid duplication between analysis and hook
 */
export function shouldInjectBracket(normalizedArabic: string, englishTranslation: string): boolean {
  // Check if word has definite article prefix patterns
  // Note: Use startsWith (not includes) to match definite article at word beginning
  const hasDefiniteArticle =
    normalizedArabic.startsWith('ال') ||
    normalizedArabic.startsWith('بال') ||
    normalizedArabic.startsWith('لل') ||
    normalizedArabic.startsWith('كال');

  if (!hasDefiniteArticle) {
    return false;
  }

  // Already has "the" in translation (check for whole word, not substring)
  // Use word boundary regex to avoid matching "the" inside words like "then", "other", "rather"
  const lowerTranslation = englishTranslation.toLowerCase();
  const theWordRegex = /\bthe\b/;
  if (theWordRegex.test(lowerTranslation)) {
    return false;
  }

  // Skip injection for divine names and words that already imply definiteness
  const lowerEnglish = englishTranslation.toLowerCase();
  const skipInjection =
    normalizedArabic.includes('الله') || // Divine name "Allah"
    lowerEnglish.includes('god') ||
    lowerEnglish.includes('allah') ||
    lowerEnglish.includes('lord') ||
    lowerEnglish.includes('creator') ||
    lowerEnglish.includes('most high');

  return !skipInjection;
}

/**
 * Analyze diacritic matches against other components to determine overlap and uniqueness
 * Returns detailed information for smart color merging decisions
 */
function analyzeDiacriticMatches(
  diacriticMatches: string[],
  otherComponents: Array<AnalyzedComponent | undefined>,
): {
  hasUnique: boolean;
  overlappingComponent: AnalyzedComponent | undefined;
  overlappingMatches: string[];
} {
  if (diacriticMatches.length === 0) {
    return { hasUnique: false, overlappingComponent: undefined, overlappingMatches: [] };
  }

  const normalizedDiacriticMatches = diacriticMatches.map(m => m.toLowerCase());

  // Find which component(s) the diacritic overlaps with
  let overlappingComponent: AnalyzedComponent | undefined;
  const overlappingMatches: string[] = [];

  for (const component of otherComponents) {
    if (!component?.englishMatches) continue;

    const componentMatchesLower = component.englishMatches.map(m => m.toLowerCase());

    // Check for overlaps - must handle both exact matches and word-within-phrase matches
    const overlap = normalizedDiacriticMatches.filter(diacriticMatch => {
      return componentMatchesLower.some(componentMatch => {
        // Exact match (e.g., "he" === "he")
        if (componentMatch === diacriticMatch) return true;

        // Word-within-phrase match (e.g., "he" within "so he")
        // Escape special regex characters and use word boundary regex to match whole words only
        const escapedMatch = diacriticMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedMatch}\\b`, 'i');
        return wordBoundaryRegex.test(componentMatch);
      });
    });

    if (overlap.length > 0) {
      overlappingMatches.push(...overlap);
      // Store the first overlapping component (usually there's only one)
      if (!overlappingComponent) {
        overlappingComponent = component;
      }
    }
  }

  // Check if at least one match is unique (not in overlapping matches)
  const hasUnique = normalizedDiacriticMatches.some(m => !overlappingMatches.includes(m));

  return { hasUnique, overlappingComponent, overlappingMatches };
}

/**
 * Detect if a diacritic is grammatically related to another component
 * Grammatical relationships warrant color merging to show they work together
 */
function areGrammaticallyRelated(
  diacritic: AnalyzedComponent,
  overlappingComponent: AnalyzedComponent,
  overlappingMatches: string[],
): boolean {
  const diacriticArabic = diacritic.arabicMatch;
  const componentType = overlappingComponent.component.type;

  // Normalize overlapping matches for comparison
  const normalizedOverlap = overlappingMatches.map(m => m.toLowerCase());

  /**
   * Relationship 1: Pronoun Suffix + Case Agreement
   * SUFFIX (pronouns like ه، ها، هم) + DIACRITIC
   * Example: عَلَيْهِ → ه (suffix "him") + ِ (genitive case marker)
   *
   * Educational decision: Diacritics on pronoun suffixes should inherit the suffix color
   * to visually group the pronoun with its case marking (هِ, هُ, هَ all = "him")
   *
   * This is more pedagogically clear than separating them, even if the diacritic's
   * English meaning ("in", "of") doesn't overlap with the pronoun's meaning ("him")
   */
  if (componentType === ComponentType.SUFFIX) {
    // Check if this is a pronoun suffix (possessive role)
    const isPronounSuffix = overlappingComponent.role === GrammaticalRole.POSSESSIVE;

    if (isPronounSuffix) {
      // Always inherit color for pronoun suffixes + diacritics
      return true;
    }

    // For non-pronoun suffixes, still check for English overlap (old logic)
    const pronounPatterns = ['he', 'it', 'they', 'his', 'her', 'their', 'him', 'them'];
    const hasOverlappingPronoun = normalizedOverlap.some(m => pronounPatterns.includes(m));
    if (hasOverlappingPronoun) {
      return true;
    }
  }

  /**
   * Relationship 2: Subject Prefix + Nominative Case
   * PREFIX (subject markers like ي، ت، ن) + DIACRITIC damma (nominative)
   * Example: يَظُنُّ → ي (prefix "he") + ُ (nominative case for subject)
   * The damma marks nominative case, which agrees with the subject prefix
   */
  if (componentType === ComponentType.PREFIX && diacriticArabic === 'ُ') {
    // Check if overlap includes subject pronoun patterns
    const subjectPatterns = ['he', 'she', 'it', 'they', 'you'];
    const hasOverlappingSubject = normalizedOverlap.some(m => subjectPatterns.includes(m));
    if (hasOverlappingSubject) {
      return true;
    }
  }

  /**
   * Relationship 3: Preposition + Genitive Case
   * PREFIX (prepositions like من، في، ب، etc.) + DIACRITIC kasra
   * Example: مِنَ البيتِ → من (preposition) + ِ (genitive required after preposition)
   * Prepositions govern genitive case in Arabic
   */
  if (componentType === ComponentType.PREFIX && diacriticArabic === 'ِ') {
    // Check if overlap includes preposition patterns
    const prepositionPatterns = ['from', 'in', 'with', 'to', 'by', 'for', 'of'];
    const hasOverlappingPreposition = normalizedOverlap.some(m => prepositionPatterns.includes(m));
    if (hasOverlappingPreposition) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a prefix is a "form with suffix" pattern that should prefer shorter form when suffix exists
 * These are prepositions ending in ى (alef maksura) that change to ي before pronoun suffixes
 * - على → عليه (upon him) uses علي form
 * - على → عليّ (upon me) should use عل form
 */
function isFormWithSuffixPattern(arabicMatch: string): boolean {
  const formsWithSuffix = ['علي', 'لدي', 'إلي'];
  return formsWithSuffix.includes(arabicMatch);
}

/**
 * Get the shortened preposition form for suffix attachment
 * على/علي → عل, لدى/لدي → لد, إلى/إلي → إل
 */
function getShortenedPrepositionForm(fullForm: string): string | undefined {
  const shortenedForms: Record<string, string> = {
    علي: 'عل',
    على: 'عل',
    لدي: 'لد',
    لدى: 'لد',
    إلي: 'إل',
    إلى: 'إل',
  };
  return shortenedForms[fullForm];
}

/**
 * Detect multiple prefixes sequentially from an Arabic word
 * Returns array of detected prefixes with their grammatical roles and the remaining Arabic text
 *
 * Validation rules to prevent over-detection:
 * 1. Only ONE definite article (ال) per word (Arabic grammar rule)
 * 2. Must leave minimum 2-char root after all prefixes (structural validation)
 * 3. Track seen roles to prevent grammatically impossible combinations
 * 4. Prevent double-lam detection (لل = ل + ال assimilation, not two ل prefixes)
 * 5. Prefer shortened preposition forms when valid shadda suffix would match
 */
function detectPrefixes(
  normalizedArabic: string,
  english: string,
  originalArabic?: string,
): { prefixes: AnalyzedComponent[]; remainingArabic: string } {
  const detectedPrefixes: AnalyzedComponent[] = [];
  let remaining = normalizedArabic;

  // Track which roles we've seen to prevent duplicates
  const seenRoles = new Set<GrammaticalRole>();

  // Keep trying to find prefixes until none are found
  // This allows detecting multiple prefixes in sequence (e.g., و + ال, ب + ال, ف + ال)
  let continueDetection = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops

  while (continueDetection && iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    const prefixMatch = findComponent(remaining, english, ARABIC_PREFIXES, ComponentType.PREFIX);

    if (prefixMatch) {
      // Extract role from the matched component
      let role = prefixMatch.component.role || GrammaticalRole.GENERIC;

      let remainingAfterPrefix = remaining.substring(prefixMatch.arabicMatch.length);

      // VALIDATION 0: Prefer shortened preposition form when shadda suffix would match
      // Problem: على/علي (3 chars) matches greedily over عل (2 chars), preventing suffix detection
      // Example: عَلَيَّ (upon me) → should be عل + يّ, not علي + (nothing)
      // Solution: If prefix is a "form with suffix" pattern (علي، لدي، إلي) and:
      //   1. No remaining text after prefix (consumed entire word)
      //   2. English has possessive pronouns
      //   3. Original Arabic ends with shadda (ّ) indicating possessive suffix
      // Then use the shortened form to allow suffix detection
      if (isFormWithSuffixPattern(prefixMatch.arabicMatch) && remainingAfterPrefix === '') {
        // Check if English has possessive pronouns that would match the suffix
        const possessiveIndicators = ['my', 'me', 'of me'];
        const lowerEnglish = english.toLowerCase();
        const hasPossessivePronoun = possessiveIndicators.some(p => lowerEnglish.includes(p));

        // Check if original Arabic ends with shadda (indicating possessive suffix like يّ)
        const hasShadda = originalArabic?.includes('ّ') ?? false;

        if (hasPossessivePronoun && hasShadda) {
          // Try using shortened form to allow suffix detection
          const shortenedForm = getShortenedPrepositionForm(prefixMatch.arabicMatch);
          if (shortenedForm && remaining.startsWith(shortenedForm)) {
            // Find the shortened component pattern
            const shortenedComponent = ARABIC_PREFIXES.find(p => p.arabic === shortenedForm);
            if (shortenedComponent) {
              // Create new match with shortened form
              const shortenedEnglishMatches = hasEnglishMatch(
                english,
                shortenedComponent.english,
                remaining,
                shortenedForm,
              );
              if (shortenedEnglishMatches.length > 0) {
                // Replace the match with shortened form
                prefixMatch.component = shortenedComponent;
                prefixMatch.arabicMatch = shortenedForm;
                prefixMatch.englishMatches = shortenedEnglishMatches;
                // Recalculate remaining and role after using shortened form
                remainingAfterPrefix = remaining.substring(shortenedForm.length);
                role = shortenedComponent.role || GrammaticalRole.GENERIC;
              }
            }
          }
        }
      }

      // VALIDATION 1: Prevent duplicate definite article (ال)
      // Arabic grammar: only ONE definite article per word
      if (
        role === GrammaticalRole.DEFINITE_ARTICLE &&
        seenRoles.has(GrammaticalRole.DEFINITE_ARTICLE)
      ) {
        // Already have a definite article - reject this match and stop
        continueDetection = false;
        continue;
      }

      // VALIDATION 2: Prevent consuming entire word as prefixes in specific cases
      // 2a. Prevent breaking known nouns like "بال" (mind)
      // Specific case: after detecting "ال", don't detect "ب" if it would leave "ال" as root
      // This prevents: "البال" → "ال" + "ب" + "ال" (WRONG - ال is article, not a root)
      // Should be: "البال" → "ال" + "بال" (CORRECT - mind is the root)
      if (remainingAfterPrefix === 'ال') {
        // Accepting this prefix would leave just "ال" which is an article, not a root
        continueDetection = false;
        continue;
      }

      // VALIDATION 3: Prevent double-letter detection for assimilation cases
      // 3a. لله (lil-laahi) - ل + الله with divine names
      // Example: لِلَّهِ (for God) = ل (for) + الله (Allah with assimilated article)
      // BUT: ل + ل is VALID for regular nouns like للقلم (for the pen)
      const hasLamPrefix = detectedPrefixes.some(p => p.arabicMatch === 'ل');
      const isSingleLamMatch = prefixMatch.arabicMatch === 'ل'; // Not 'ال'
      const lowerEnglish = english.toLowerCase();
      const isDivineName =
        lowerEnglish.includes('god') ||
        lowerEnglish.includes('allah') ||
        lowerEnglish.includes('lord') ||
        remaining.includes('الله'); // Check if الله appears in remaining

      if (hasLamPrefix && isSingleLamMatch && isDivineName) {
        // Already have a lam prefix, this is another lam, and it's a divine name
        // Reject this match to keep الله intact
        continueDetection = false;
        continue;
      }

      // 3b. مما (mimma) - من + ما assimilation
      // Example: مِمَّا (from what) = من (from) + ما (what) with assimilated ن
      // Pattern: After detecting م (shortened من), don't consume ما as another prefix
      // This leaves ما (what) as the root/remaining portion
      const hasMeemPrefix = detectedPrefixes.some(p => p.arabicMatch === 'م');
      const isMeemMatch = prefixMatch.arabicMatch === 'م';
      const isMaMatch = prefixMatch.arabicMatch === 'ما';

      // Block م + م (double meem)
      if (hasMeemPrefix && isMeemMatch) {
        // Already have a meem prefix, this is another meem - likely من + ما assimilation
        // Reject to prevent مما being detected as م + م + ا
        continueDetection = false;
        continue;
      }

      // Block م + ما (meem followed by ma)
      if (hasMeemPrefix && isMaMatch) {
        // Already detected م, and now trying to detect ما
        // This is the مما assimilation pattern: leave ما as root, not another prefix
        continueDetection = false;
        continue;
      }

      // VALIDATION 4: Prevent single-letter prepositions AFTER definite article
      // Arabic grammar: Prepositions come BEFORE ال (e.g., بال = bi-al), not after
      // Example: "البركة" (al-baraka) = ال + بركة, NOT ال + ب + ركة
      // Example: "المعاني" (al-ma'ani) = ال + معاني, NOT ال + م + عاني
      // The ب in بركة is part of the root ب-ر-ك (blessing), not a preposition
      // The م in معاني is part of the root م-ع-ن (meaning), not a preposition
      // "of" in English comes from the genitive case (kasra), not from these letters
      const hasDefiniteArticle = seenRoles.has(GrammaticalRole.DEFINITE_ARTICLE);
      const isSingleLetterPreposition =
        role === GrammaticalRole.PREPOSITION &&
        prefixMatch.arabicMatch.length === 1 &&
        ['ب', 'ل', 'ك', 'م'].includes(prefixMatch.arabicMatch);

      if (hasDefiniteArticle && isSingleLetterPreposition) {
        // Already have definite article, and this is a single-letter preposition
        // Reject this match - prepositions come before ال, not after
        // Stop detection to preserve the root
        continueDetection = false;
        continue;
      }

      // VALIDATION 5: Reject high-risk prepositions when "of" appears mid-phrase
      // Problem: "م" matches "of" in idioms like "school of thought" where "of" isn't a grammatical preposition
      // Solution: Check if "of" appears between two content words (not at phrase boundaries)
      //
      // Examples:
      //   - "school of thought" → "of" at index 1 (between school and thought) → REJECT
      //   - "of the people" → "of" at index 0 (start of phrase) → ALLOW (if structural validation passed)
      //   - "because of" → "of" at index 1 (end of phrase) → ALLOW (if structural validation passed)
      if (isHighRiskPreposition(prefixMatch.arabicMatch)) {
        const normalizedEnglish = normalizeEnglish(english);
        const words = normalizedEnglish.split(/\s+/).filter(Boolean);

        // Check if any of the matched English patterns is "of" appearing mid-phrase
        const hasEmbeddedOf = prefixMatch.englishMatches.some(match => {
          const normalizedMatch = normalizeEnglish(match);
          if (normalizedMatch === 'of') {
            const matchIndex = words.indexOf('of');
            // Embedded = not at start (0) and not at end (length-1)
            return matchIndex > 0 && matchIndex < words.length - 1;
          }
          return false;
        });

        if (hasEmbeddedOf) {
          // "of" is embedded mid-phrase - likely part of an idiom, not a grammatical preposition
          continueDetection = false;
          continue;
        }
      }

      // VALIDATION 6: Prevent splitting يت (Form VI verb pattern: يَتَفَاعَلُ)
      // Arabic verb morphology: يَتَ together indicates Form VI (mutual/reciprocal action)
      // Example: يَتَدَارَسُ (ya-ta-dārasu) = "studying together" (Form VI from root د-ر-س)
      // Correct: و + يتدارس (conjunction + Form VI verb)
      // Incorrect: و + ي + ت + دارس (conjunction + subject prefix + subject prefix + root)
      //
      // Form VI characteristics:
      //   - Present tense: يَتَفَاعَلُ (ya-ta-fāʿalu) - 3rd person masculine singular
      //   - Past tense: تَفَاعَلَ (ta-fāʿala)
      //   - The تَ in Form VI is part of the verb form pattern, not a separate subject marker
      //
      // Examples where this applies:
      //   - يَتَعَاوَنُ (ya-taʿāwanu) = "he cooperates" (Form VI from ع-و-ن)
      //   - يَتَبَادَلُ (ya-tabādalu) = "he exchanges" (Form VI from ب-د-ل)
      //   - يَتَشَارَكُ (ya-tashāraku) = "he shares" (Form VI from ش-ر-ك)
      //
      // Strategy: Look ahead when matching ي to see if ت follows immediately
      // If ي is followed by ت, reject ي to keep يت together
      const isYaMatch = prefixMatch.arabicMatch === 'ي';
      const isTaMatch = prefixMatch.arabicMatch === 'ت';

      if (isYaMatch && remainingAfterPrefix.startsWith('ت')) {
        // Matched ي and next char is ت - this is Form VI pattern
        // Reject ي to keep يت together as part of the verb form
        continueDetection = false;
        continue;
      }

      if (isTaMatch) {
        // Check if ي was previously detected - if so, this is the ت that should have been kept with ي
        const hasYaPrefix = detectedPrefixes.some(p => p.arabicMatch === 'ي');
        if (hasYaPrefix) {
          // Already detected ي, now seeing ت - this is Form VI pattern (fallback check)
          // This shouldn't happen if the ي check above worked, but added for safety
          continueDetection = false;
          continue;
        }
      }

      // VALIDATION 7: Prevent conjunctions/prepositions after subject markers with insufficient root
      // Problem: Form V/Form II verbs have root radicals (و، ي) that match conjunction/preposition patterns
      // Example: تَوَدَّدَ (ta-waddada) = Form V verb from root و-د-د (to show affection)
      // Incorrect: و + ت + و + دد (3 prefixes, treating و as conjunction twice)
      // Correct: و + تودد (1 prefix + Form V verb, where second و is first radical)
      //
      // Form V characteristics:
      //   - Pattern: تَفَعَّلَ (ta-faʿʿala) - reflexive/intensive form
      //   - First radical can be و or ي, which match conjunction patterns
      //   - After subject marker ت, the following و/ي is part of the root, not a prefix
      //
      // Examples where this applies:
      //   - وَتَوَدَّدْ = و (and) + تودد (Form V: you show affection)
      //   - وَيَوَدُّ = و (and) + يود (he loves) - و is root radical, not conjunction
      //   - فَتَبَيَّنَ = ف (so) + تبين (Form V: it became clear) - ي is root radical
      //
      // Strategy: After detecting subject marker (ت، ي، ن، أ), don't allow single-letter
      // conjunctions/prepositions (و، ف، ب، ل) if they would leave < 3 chars remaining.
      // This prevents splitting root radicals that happen to match prefix patterns.
      const hasSubjectMarker = detectedPrefixes.some(p =>
        ['ي', 'ت', 'ن', 'أ'].includes(p.arabicMatch),
      );
      const isSingleLetterConjunctionOrPreposition = ['و', 'ف', 'ب', 'ل'].includes(
        prefixMatch.arabicMatch,
      );

      if (hasSubjectMarker && isSingleLetterConjunctionOrPreposition) {
        // Check if accepting this prefix would leave insufficient root structure
        if (remainingAfterPrefix.length < 3) {
          // Would leave < 3 chars - this "prefix" is likely a root radical
          // Example: After detecting و + ت, seeing another و with "دد" remaining
          // The second و is part of root و-د-د, not a conjunction
          continueDetection = false;
          continue;
        }
      }

      // All validations passed - accept this prefix
      seenRoles.add(role);

      const analyzedPrefix: AnalyzedComponent = {
        ...prefixMatch,
        role,
        position: detectedPrefixes.length,
      };

      detectedPrefixes.push(analyzedPrefix);

      // Remove matched prefix from remaining text
      remaining = remainingAfterPrefix;
    } else {
      // No more prefixes found
      continueDetection = false;
    }
  }

  return { prefixes: detectedPrefixes, remainingArabic: remaining };
}

/**
 * Calculate remaining English words after removing words matched by components
 * @param originalEnglish - The original English translation
 * @param components - All detected components (prefixes, suffix, infix, diacritic)
 * @returns Remaining English words that weren't matched by any component
 */
function calculateRemainingEnglish(
  originalEnglish: string,
  components: {
    prefixes: AnalyzedComponent[];
    suffix?: AnalyzedComponent;
    infix?: AnalyzedComponent;
    diacritic?: AnalyzedComponent;
  },
): string {
  // Collect all English matches from all components
  const matchedWords = new Set<string>();

  // Add prefix matches
  components.prefixes.forEach(prefix => {
    prefix.englishMatches.forEach(match => {
      // Split multi-word matches and add each word
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  });

  // Add suffix matches
  if (components.suffix) {
    components.suffix.englishMatches.forEach(match => {
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  }

  // Add infix matches
  if (components.infix) {
    components.infix.englishMatches.forEach(match => {
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  }

  // Add diacritic matches
  if (components.diacritic) {
    components.diacritic.englishMatches.forEach(match => {
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  }

  // Remove matched words from original English
  const words = originalEnglish.toLowerCase().split(/\s+/);
  const remainingWords = words.filter(word => {
    const trimmed = word.trim();
    return trimmed && !matchedWords.has(trimmed);
  });

  return remainingWords.join(' ');
}

/**
 * Main function to analyze an Arabic word and its English translation for components
 */
export function analyzeArabicWord(arabic: string, english: string): WordAnalysis {
  // Create cache key from normalized Arabic and original English
  // Note: Use original English to avoid cache collisions from punctuation removal
  // e.g., "book, guide" and "book; guide" should be cached separately
  const normalized = normalizeArabic(arabic);
  const cacheKey = `${normalized}|${english}`;

  // Check cache first
  const cachedResult = ANALYSIS_CACHE.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check for bracket injection using shared logic FIRST
  // Bracket injection can turn single words into multi-word phrases
  const hasBracketInjection = shouldInjectBracket(normalized, english);

  // CRITICAL: Single-word rule - no color-coding for educational clarity
  // This is the single source of truth for the single-word check
  // Expand contractions first (e.g., "it's" → "it is") before counting words
  const expandedEnglish = expandContractions(english);
  const wordCount = expandedEnglish.trim().split(/\s+/).length;
  if (wordCount === 1 && !hasBracketInjection) {
    // Only skip analysis if single word AND no bracket injection
    // If bracket injection is needed, callers will add "[the]" making it multi-word
    const singleWordResult: WordAnalysis = {
      original: { arabic, english },
      prefixes: [], // No prefixes for single words
      hasComponents: false,
      remainingArabic: normalized,
      remainingEnglish: normalizeEnglish(english),
      hasBracketInjection,
    };

    cacheWithLRUEviction(ANALYSIS_CACHE, cacheKey, singleWordResult);

    return singleWordResult;
  }

  // Detect multiple prefixes sequentially
  const { prefixes: detectedPrefixes, remainingArabic: remainingAfterPrefixes } = detectPrefixes(
    normalized,
    english,
    arabic, // Pass original Arabic for shadda detection
  );

  // CRITICAL: Detect suffix from remaining text AFTER prefixes to avoid false "hidden prefix" detection
  // Example: "تجده" → prefix "ت" detected → check suffix on "جده" (not full "تجده")
  // This prevents validation from incorrectly flagging already-detected prefixes as "hidden"
  let suffix = findComponent(
    remainingAfterPrefixes,
    english,
    ARABIC_SUFFIXES,
    ComponentType.SUFFIX,
  );

  // ADDITIONAL VALIDATION: Prevent suffix from matching same English words as prefix
  // Example: "يكره" (he hates) → prefix ي matches "he", suffix ה shouldn't also match "he"
  // If prefix exists AND suffix English overlaps with prefix English AND remaining would be < 3 chars → reject suffix
  if (suffix && detectedPrefixes.length > 0) {
    const prefixEnglishWords = new Set<string>();
    detectedPrefixes.forEach(prefix => {
      prefix.englishMatches.forEach(match => {
        // Only check single-word patterns for overlap
        // Multi-word patterns like "of you" should not be split
        if (!match.includes(' ')) {
          prefixEnglishWords.add(match.toLowerCase());
        }
      });
    });

    const suffixEnglishWords = suffix.englishMatches
      .filter(match => !match.includes(' ')) // Only single-word patterns
      .map(match => match.toLowerCase());
    const hasOverlap = suffixEnglishWords.some(word => prefixEnglishWords.has(word));

    if (hasOverlap) {
      // Overlap detected - check if remaining is too short
      const remainingAfterSuffix = remainingAfterPrefixes.substring(
        0,
        remainingAfterPrefixes.length - suffix.arabicMatch.length,
      );

      // If remaining is exactly 2 chars and there's English overlap, likely a false positive
      // Real case: "يكره" → ي(he) + كره, removing ה leaves "كر" (2 chars) - FALSE POSITIVE
      // Valid case: "يكتبه" → ي + كتبه, removing ה leaves "كتب" (3+ chars) - OK
      // EXCEPTION: Allow 0-1 chars (prefix+suffix compounds like مِنَّا = من + نا with no root)
      if (remainingAfterSuffix.length === 2) {
        suffix = undefined; // Reject this suffix as false positive
      }
      // If length is 0-1, it's a valid prefix+suffix compound (keep suffix)
      // If length is 3+, it's valid (keep suffix)
    }
  }

  // ADDITIONAL VALIDATION: Prevent high-risk suffix matching subject pronouns when no prefix exists
  // Example: "כרה" (he hates) → NO prefix, "he" is verb conjugation, not suffix ה
  // Example: "وجه" (he faced) → NO prefix, "he" is verb conjugation, not suffix ה
  // Valid case: "دمه" (his blood) → NO prefix, but "his" is possessive (valid suffix)
  // Valid case: "كنا" (we were) → NO prefix, "we" matches suffix נا (valid)
  // Only apply to high-risk suffixes (ה, ها, ي, כ) that can be confused with root letters
  if (suffix && detectedPrefixes.length === 0 && isHighRiskSuffix(suffix.arabicMatch)) {
    const remainingAfterSuffix = remainingAfterPrefixes.substring(
      0,
      remainingAfterPrefixes.length - suffix.arabicMatch.length,
    );

    if (remainingAfterSuffix.length < 3) {
      // Check if English contains subject pronouns (these belong to verb conjugation, not suffixes)
      // Only check for pronouns that match the high-risk suffix (he/she/it/i)
      // Don't check "we" (נא suffix is almost always valid) or "you" (varied usage)
      const subjectPronouns = ['he', 'she', 'it', 'i'];
      const englishWords = english.toLowerCase().split(/\s+/);
      const hasSubjectPronoun = englishWords.some(word => subjectPronouns.includes(word));

      if (hasSubjectPronoun) {
        // NEW FIX: Check if the pronoun is actually claimed by the suffix's English patterns
        // Example: "رآها" = "he sees it" → "it" is in ها suffix's englishMatches → KEEP
        // Example: "كره" = "he hates" → "he" is NOT in ه suffix's englishMatches → REJECT
        const suffixEnglishWords = suffix.englishMatches.flatMap(match =>
          match.toLowerCase().split(/\s+/),
        );
        const pronounMatchesSuffix = englishWords.some(
          word => subjectPronouns.includes(word) && suffixEnglishWords.includes(word),
        );

        if (!pronounMatchesSuffix) {
          // Subject pronoun exists BUT suffix doesn't claim it → likely verb conjugation, not suffix
          suffix = undefined; // Reject this suffix as false positive
        }
        // If pronounMatchesSuffix is true, keep the suffix (it's a valid object/possessive pronoun)
      }
    }
  }

  // Check for diacritics in the original text (before normalization)
  const diacritic = findDiacritic(arabic, english);

  // Resolve overlaps between the last prefix and suffix (only last prefix can overlap with suffix)
  const lastPrefix =
    detectedPrefixes.length > 0 ? detectedPrefixes[detectedPrefixes.length - 1] : undefined;
  const { resolvedPrefix, resolvedSuffix } = resolveOverlap(normalized, lastPrefix, suffix);

  // If last prefix was removed due to overlap, remove it from the detected prefixes array
  let finalPrefixes = detectedPrefixes;
  if (lastPrefix && !resolvedPrefix) {
    finalPrefixes = detectedPrefixes.slice(0, -1);
  }

  // Calculate remaining Arabic text after removing all prefixes and suffix
  let remaining = remainingAfterPrefixes; // Already has prefixes removed
  if (resolvedSuffix)
    remaining = remaining.substring(0, remaining.length - resolvedSuffix.arabicMatch.length);

  // Look for infixes in the remaining text (pass all prefixes/suffix to filter false positives)
  const infix =
    remaining.length > 2 ? findInfix(remaining, english, finalPrefixes, resolvedSuffix) : undefined;

  // Smart diacritic resolution: filter, keep, or merge colors based on grammatical relationships
  let resolvedDiacritic: AnalyzedComponent | undefined;

  if (diacritic) {
    const matchAnalysis = analyzeDiacriticMatches(diacritic.englishMatches, [
      ...finalPrefixes, // Include all prefixes
      infix,
      resolvedSuffix,
    ]);

    // Special case: Pronoun suffix + diacritic (educational grouping)
    // Always inherit color for diacritics on pronoun suffixes, even without English overlap
    const isPronounSuffixPresent = resolvedSuffix?.role === GrammaticalRole.POSSESSIVE;

    if (isPronounSuffixPresent) {
      // Diacritic on pronoun suffix → inherit suffix color for visual grouping
      // Example: עَלَيْهِ → ה + ִ both colored purple (pronoun + case marker)
      resolvedDiacritic = {
        ...diacritic,
        inheritColorFrom: ComponentType.SUFFIX,
      };
    } else if (matchAnalysis.hasUnique) {
      // Case 1: Diacritic has unique English match → keep with its own color
      resolvedDiacritic = diacritic;
    } else if (matchAnalysis.overlappingComponent) {
      // Case 2: Diacritic overlaps with another component
      const isRelated = areGrammaticallyRelated(
        diacritic,
        matchAnalysis.overlappingComponent,
        matchAnalysis.overlappingMatches,
      );

      if (isRelated) {
        // Grammatically related → keep but inherit color from related component
        resolvedDiacritic = {
          ...diacritic,
          inheritColorFrom: matchAnalysis.overlappingComponent.component.type,
        };
      } else {
        // Not related → filter out to avoid redundant coloring
        resolvedDiacritic = undefined;
      }
    } else {
      // Case 3: No overlap (shouldn't happen, but handle gracefully)
      resolvedDiacritic = diacritic;
    }
  }

  // Calculate remaining English by removing matched component words
  const remainingEnglish = calculateRemainingEnglish(english, {
    prefixes: finalPrefixes,
    suffix: resolvedSuffix,
    infix,
    diacritic: resolvedDiacritic,
  });

  // PERFORMANCE OPTIMIZATION: Skip color-coding for single standalone components
  // Educational principle: Standalone particles provide no compositional insight
  //
  // Examples that WILL be skipped:
  //   - "بل → but rather" - single conjunction, entire word consumed, no composition
  //   - "ثم → then" - single particle, entire word consumed, no composition
  //   - "وَهُوَ → and he" - conjunction + pronoun, pure particles, no composition
  //
  // Examples that will NOT be skipped (still colored):
  //   - "فإذا → so when" - 2 prefixes (ف + إذا), shows composition ✓
  //   - "والله → and by Allah" - prefix + remaining root, shows composition ✓
  //   - "كِتَابٌ → book" - has diacritic, educational value ✓
  //   - "بِهِ → with him" - preposition + pronoun, shows composition ✓
  //
  // Performance benefit: Saves expensive color segment generation and rendering
  // for words that provide no educational value when colored.
  const isStandalone = isSingleStandaloneComponent(
    {
      prefixes: finalPrefixes,
      suffix: resolvedSuffix,
      infix,
      diacritic: resolvedDiacritic,
    },
    normalized,
  );

  // Check if this is a pure particle combination (conjunction + pronoun)
  const isPureParticles = isPureParticleCombination(finalPrefixes, remaining.trim());

  const result: WordAnalysis = {
    original: { arabic, english },
    prefixes: finalPrefixes, // Array of prefixes
    infix,
    suffix: resolvedSuffix,
    diacritic: resolvedDiacritic,
    // Override hasComponents to false if:
    // 1. Single standalone component (entire word is one particle)
    // 2. Pure particle combination (conjunction + pronoun, no root)
    hasComponents:
      isStandalone || isPureParticles
        ? false
        : Boolean(finalPrefixes.length > 0 || infix || resolvedSuffix || resolvedDiacritic),
    remainingArabic: remaining.trim(),
    remainingEnglish,
    hasBracketInjection,
  };

  cacheWithLRUEviction(ANALYSIS_CACHE, cacheKey, result);

  return result;
}

/**
 * Maps normalized position back to original text with diacritics
 */
function mapToOriginalPosition(
  original: string,
  normalizedLength: number,
  fromEnd = false,
): number {
  let position = fromEnd ? original.length : 0;
  let count = 0;

  if (fromEnd) {
    // Count backwards from end
    for (let i = original.length - 1; i >= 0 && count < normalizedLength; i--) {
      const char = original[i];
      if (char && !DIACRITIC_REGEX.test(char)) {
        count++;
      }
      position = i;
    }
  } else {
    // Count forwards from start
    let i = 0;
    for (; i < original.length && count < normalizedLength; i++) {
      const char = original[i];
      if (char && !DIACRITIC_REGEX.test(char)) {
        count++;
      }
    }
    // After reaching the target number of base characters, include any
    // immediately trailing diacritics so they stay attached to the segment
    while (i < original.length) {
      const nextChar = original[i];
      if (nextChar && DIACRITIC_REGEX.test(nextChar)) {
        i++;
        continue;
      }
      break;
    }
    position = i;
  }

  return position;
}

/**
 * Get the appropriate color name for a diacritic based on color inheritance
 * Must match the exact color logic used by the component it inherits from (including role-based colors)
 */
function getDiacriticColorName(
  diacritic: AnalyzedComponent | undefined,
  analysis?: WordAnalysis,
): string {
  if (!diacritic) return 'text';

  // If diacritic inherits color from a related component, use that component's color logic
  if (diacritic.inheritColorFrom === ComponentType.SUFFIX && analysis?.suffix) {
    // Match suffix color logic: use role-based color if available, otherwise type-based
    return getComponentColorName(analysis.suffix, ComponentType.SUFFIX);
  }

  if (diacritic.inheritColorFrom === ComponentType.PREFIX && analysis?.prefixes) {
    // Match prefix color logic: also uses role-based colors
    const prefix = analysis.prefixes[0]; // Get first prefix (most relevant for diacritic)
    return getComponentColorName(prefix, ComponentType.PREFIX);
  }

  if (diacritic.inheritColorFrom) {
    // Fallback for other component types (infix, etc.)
    return COMPONENT_TYPE_CONFIG[diacritic.inheritColorFrom].colorName;
  }

  // Otherwise use the diacritic's own color
  return COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName;
}

/**
 * Get the appropriate color name for a component based on role or type
 * Uses role-based color if available, otherwise falls back to type-based color
 */
function getComponentColorName(
  component: AnalyzedComponent | undefined,
  defaultType: ComponentType,
): string {
  if (!component) {
    return COMPONENT_TYPE_CONFIG[defaultType].colorName;
  }

  return component.role
    ? GRAMMATICAL_ROLE_COLORS[component.role]
    : COMPONENT_TYPE_CONFIG[defaultType].colorName;
}

/**
 * Optimized reconstruction for coloring with infix and diacritic support
 */
function reconstructWithColors(analysis: WordAnalysis) {
  const segments: { text: string; colorName: string; type: string }[] = [];
  const { arabic } = analysis.original;
  let processed = 0;

  // Add all prefix segments with role-based colors
  if (analysis.prefixes && analysis.prefixes.length > 0) {
    for (let i = 0; i < analysis.prefixes.length; i++) {
      const prefix = analysis.prefixes[i];
      if (!prefix) continue; // TypeScript strict null check

      const prefixLength = prefix.arabicMatch.length;
      const isLastPrefix = i === analysis.prefixes.length - 1;

      let originalEnd: number;

      // If this is the last prefix and there's no remaining root, consume all remaining text
      if (isLastPrefix && !analysis.remainingArabic && !analysis.suffix) {
        originalEnd = arabic.length;
      } else {
        const mappedEnd =
          mapToOriginalPosition(arabic.substring(processed), prefixLength) + processed;
        // Ensure we don't exceed the original string length
        originalEnd = Math.min(mappedEnd, arabic.length);
      }

      // Use role-based color if available, otherwise fall back to type-based color
      const colorName = getComponentColorName(prefix, ComponentType.PREFIX);

      segments.push({
        text: arabic.substring(processed, originalEnd),
        colorName,
        type: 'prefix',
      });
      processed = originalEnd;
    }
  }

  // Handle infix within the remaining text
  if (analysis.infix && analysis.suffix) {
    // Complex case: prefix + infix + suffix
    const suffixOriginalStart = mapToOriginalPosition(
      arabic,
      analysis.suffix.arabicMatch.length,
      true,
    );
    const remainingText = arabic.substring(processed, suffixOriginalStart);

    // Find infix position within the remaining text segment
    const normalizedRemaining = normalizeArabic(remainingText);
    const infixIndex = normalizedRemaining.indexOf(analysis.infix.arabicMatch);

    if (infixIndex > 0) {
      // Add pre-infix root segment
      const preInfixEnd = mapToOriginalPosition(remainingText, infixIndex);
      segments.push({
        text: remainingText.substring(0, preInfixEnd),
        colorName: 'arabicText',
        type: 'root',
      });
      processed += preInfixEnd;
    }

    // Add infix segment
    const infixEnd = mapToOriginalPosition(
      remainingText,
      infixIndex + analysis.infix.arabicMatch.length,
    );
    segments.push({
      text: remainingText.substring(
        infixIndex > 0 ? mapToOriginalPosition(remainingText, infixIndex) : 0,
        infixEnd,
      ),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].colorName,
      type: 'infix',
    });
    processed =
      processed +
      infixEnd -
      (infixIndex > 0 ? mapToOriginalPosition(remainingText, infixIndex) : 0);

    // Add post-infix root segment if there's remaining text before suffix
    if (infixEnd < remainingText.length) {
      segments.push({
        text: remainingText.substring(infixEnd),
        colorName: 'arabicText',
        type: 'root',
      });
      processed = suffixOriginalStart;
    }

    // Add suffix segment (handle diacritic separately if it exists)
    let suffixText = arabic.substring(suffixOriginalStart);
    if (analysis.diacritic && suffixText.endsWith(analysis.diacritic.arabicMatch)) {
      // Split suffix to separate the diacritic
      const suffixWithoutDiacritic = suffixText.substring(
        0,
        suffixText.length - analysis.diacritic.arabicMatch.length,
      );
      if (suffixWithoutDiacritic) {
        segments.push({
          text: suffixWithoutDiacritic,
          colorName: getComponentColorName(analysis.suffix, ComponentType.SUFFIX),
          type: 'suffix',
        });
      }
      segments.push({
        text: analysis.diacritic.arabicMatch,
        colorName: getDiacriticColorName(analysis.diacritic, analysis),
        type: 'diacritic',
      });
    } else {
      segments.push({
        text: suffixText,
        colorName: getComponentColorName(analysis.suffix, ComponentType.SUFFIX),
        type: 'suffix',
      });
    }
  } else if (analysis.infix) {
    // Simpler case: infix without suffix
    const remainingText = arabic.substring(processed);
    const normalizedRemaining = normalizeArabic(remainingText);
    const infixIndex = normalizedRemaining.indexOf(analysis.infix.arabicMatch);

    if (infixIndex > 0) {
      // Add pre-infix root segment
      const preInfixEnd = mapToOriginalPosition(remainingText, infixIndex);
      segments.push({
        text: remainingText.substring(0, preInfixEnd),
        colorName: 'arabicText',
        type: 'root',
      });
    }

    // Add infix segment
    const infixStart = infixIndex > 0 ? mapToOriginalPosition(remainingText, infixIndex) : 0;
    const infixEnd = mapToOriginalPosition(
      remainingText,
      infixIndex + analysis.infix.arabicMatch.length,
    );
    segments.push({
      text: remainingText.substring(infixStart, infixEnd),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].colorName,
      type: 'infix',
    });

    // Add post-infix root segment if there's remaining text
    if (infixEnd < remainingText.length) {
      let postInfixText = remainingText.substring(infixEnd);
      // Handle diacritic separately if it exists
      if (analysis.diacritic && postInfixText.endsWith(analysis.diacritic.arabicMatch)) {
        const rootWithoutDiacritic = postInfixText.substring(
          0,
          postInfixText.length - analysis.diacritic.arabicMatch.length,
        );
        if (rootWithoutDiacritic) {
          segments.push({
            text: rootWithoutDiacritic,
            colorName: 'arabicText',
            type: 'root',
          });
        }
        segments.push({
          text: analysis.diacritic.arabicMatch,
          colorName: getDiacriticColorName(analysis.diacritic, analysis),
          type: 'diacritic',
        });
      } else {
        segments.push({
          text: postInfixText,
          colorName: 'arabicText',
          type: 'root',
        });
      }
    }
  } else if (analysis.suffix) {
    // Original suffix-only logic
    const originalStart = mapToOriginalPosition(arabic, analysis.suffix.arabicMatch.length, true);

    // Add middle segment if there's a gap
    if (originalStart > processed) {
      segments.push({
        text: arabic.substring(processed, originalStart),
        colorName: 'arabicText',
        type: 'root',
      });
    }

    // Add suffix segment (handle diacritic separately if it exists)
    let suffixText = arabic.substring(originalStart);
    if (analysis.diacritic && suffixText.endsWith(analysis.diacritic.arabicMatch)) {
      // Split suffix to separate the diacritic
      const suffixWithoutDiacritic = suffixText.substring(
        0,
        suffixText.length - analysis.diacritic.arabicMatch.length,
      );
      if (suffixWithoutDiacritic) {
        segments.push({
          text: suffixWithoutDiacritic,
          colorName: getComponentColorName(analysis.suffix, ComponentType.SUFFIX),
          type: 'suffix',
        });
      }
      segments.push({
        text: analysis.diacritic.arabicMatch,
        colorName: getDiacriticColorName(analysis.diacritic, analysis),
        type: 'diacritic',
      });
    } else {
      segments.push({
        text: suffixText,
        colorName: getComponentColorName(analysis.suffix, ComponentType.SUFFIX),
        type: 'suffix',
      });
    }
  } else if (processed < arabic.length && analysis.remainingArabic) {
    // Add remaining text as root ONLY if analysis detected a root
    // (Don't add phantom roots when all text is consumed by prefixes)
    let remainingText = arabic.substring(processed);
    if (analysis.diacritic && remainingText.endsWith(analysis.diacritic.arabicMatch)) {
      const rootWithoutDiacritic = remainingText.substring(
        0,
        remainingText.length - analysis.diacritic.arabicMatch.length,
      );
      if (rootWithoutDiacritic) {
        segments.push({
          text: rootWithoutDiacritic,
          colorName: 'arabicText',
          type: 'root',
        });
      }
      segments.push({
        text: analysis.diacritic.arabicMatch,
        colorName: getDiacriticColorName(analysis.diacritic, analysis),
        type: 'diacritic',
      });
    } else {
      segments.push({
        text: remainingText,
        colorName: 'arabicText',
        type: 'root',
      });
    }
  }

  // Handle diacritic-only case (no other components)
  if (analysis.diacritic && segments.length === 0) {
    const rootWithoutDiacritic = arabic.substring(
      0,
      arabic.length - analysis.diacritic.arabicMatch.length,
    );
    if (rootWithoutDiacritic) {
      segments.push({
        text: rootWithoutDiacritic,
        colorName: 'arabicText',
        type: 'root',
      });
    }
    segments.push({
      text: analysis.diacritic.arabicMatch,
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName,
      type: 'diacritic',
    });
  }

  // Fallback: if no segments, add whole word
  if (segments.length === 0) {
    segments.push({ text: arabic, colorName: 'arabicText', type: 'root' });
  }

  return { segments, totalText: arabic };
}

/**
 * Pre-computes colored segments for a word given theme colors
 * Used during data loading to avoid computing during render
 */
export function computeColoredSegments(
  arabicWord: string,
  englishTranslation: string,
  colors: {
    tint: string;
    primary: string;
    secondary: string;
    secondaryText: string;
    warning: string;
    error: string;
    success: string;
    info: string;
    accent: string;
    violet: string;
    indigo: string;
    coral: string;
    text: string;
    arabicText: string;
    grammar: {
      preposition: string;
      possessive: string;
      particle: string;
      interrogative: string;
      verbConjugation: string;
      negation: string;
      subjectPrefix: string;
      plural: string;
      demonstrative: string;
      conjunction: string;
      futureTense: string;
      definiteArticle: string;
    };
  },
): ColoredSegment[] {
  // Apply bracket injection if needed
  const normalizedArabic = normalizeArabic(arabicWord);
  const processedEnglish = shouldInjectBracket(normalizedArabic, englishTranslation)
    ? `[the] ${englishTranslation}`
    : englishTranslation;

  // Analyze word (single-word check happens inside analyzeArabicWord now)
  const analysis = analyzeArabicWord(arabicWord, processedEnglish);

  // Return plain text if no components found (includes single-word case)
  if (!analysis?.hasComponents) {
    return [{ text: arabicWord, color: colors.arabicText, type: 'root' as const }];
  }

  const formatted = formatWordAnalysis(analysis);
  if (!formatted?.reconstructedArabic) {
    return [{ text: arabicWord, color: colors.arabicText, type: 'root' as const }];
  }

  const colorMap: Record<string, string> = {
    tint: colors.tint,
    primary: colors.primary,
    secondary: colors.secondary,
    secondaryText: colors.secondaryText,
    warning: colors.warning,
    error: colors.error,
    success: colors.success,
    info: colors.info,
    accent: colors.accent,
    violet: colors.violet,
    indigo: colors.indigo,
    coral: colors.coral,
    text: colors.text,
    arabicText: colors.arabicText,
    'grammar.preposition': colors.grammar.preposition,
    'grammar.possessive': colors.grammar.possessive,
    'grammar.particle': colors.grammar.particle,
    'grammar.interrogative': colors.grammar.interrogative,
    'grammar.verbConjugation': colors.grammar.verbConjugation,
    'grammar.negation': colors.grammar.negation,
    'grammar.subjectPrefix': colors.grammar.subjectPrefix,
    'grammar.plural': colors.grammar.plural,
    'grammar.demonstrative': colors.grammar.demonstrative,
    'grammar.conjunction': colors.grammar.conjunction,
    'grammar.futureTense': colors.grammar.futureTense,
    'grammar.definiteArticle': colors.grammar.definiteArticle,
  };

  return formatted.reconstructedArabic.segments.map(segment => ({
    text: segment.text,
    color: colorMap[segment.colorName] || colors.text,
    type: segment.type as ColoredSegment['type'],
  }));
}

/**
 * Formats analysis for tooltip display with infix support
 */
export function formatWordAnalysis(analysis: WordAnalysis) {
  // Remove brackets from English for display (show "the" instead of "[the]")
  const englishForDisplay = analysis.original.english.replace(/^\[the\]\s*/, 'the ');

  const title = `${analysis.original.arabic} → ${englishForDisplay}`;
  const reconstructedArabic = analysis.hasComponents ? reconstructWithColors(analysis) : undefined;

  const sections: {
    type: 'original' | 'components' | 'root';
    content?: string;
    arabicPart?: string;
    englishPart?: string;
    colorName?: string;
    icon?: string;
  }[] = [{ type: 'original', content: englishForDisplay }];

  // Add all prefixes with role-based colors
  if (analysis.prefixes) {
    analysis.prefixes.forEach(prefix => {
      // Use role-based color if role is defined, otherwise fall back to type-based color
      const colorName = getComponentColorName(prefix, ComponentType.PREFIX);

      sections.push({
        type: 'components',
        arabicPart: prefix.arabicMatch,
        englishPart: prefix.englishMatches.join(' / '),
        colorName,
        icon: COMPONENT_TYPE_CONFIG[ComponentType.PREFIX].icon,
      });
    });
  }

  if (analysis.infix) {
    sections.push({
      type: 'components',
      arabicPart: analysis.infix.arabicMatch,
      englishPart: analysis.infix.englishMatches.join(' / '),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].icon,
    });
  }

  if (analysis.suffix) {
    // Use role-based color if role is defined, otherwise fall back to type-based color
    const colorName = getComponentColorName(analysis.suffix, ComponentType.SUFFIX);

    sections.push({
      type: 'components',
      arabicPart: analysis.suffix.arabicMatch,
      englishPart: analysis.suffix.englishMatches.join(' / '),
      colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].icon,
    });
  }

  if (analysis.diacritic) {
    // If diacritic inherits color from related component, use that color instead
    // Must use getDiacriticColorName to get role-based colors (e.g., violet for POSSESSIVE)
    const colorName = getDiacriticColorName(analysis.diacritic, analysis);

    sections.push({
      type: 'components',
      arabicPart: analysis.diacritic.arabicMatch,
      englishPart: analysis.diacritic.englishMatches.join(' / '),
      colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].icon,
    });
  }

  if (analysis.remainingArabic && analysis.remainingEnglish) {
    sections.push({
      type: 'root',
      arabicPart: analysis.remainingArabic,
      englishPart: analysis.remainingEnglish,
      colorName: 'text',
      icon: '→',
    });
  }

  return { title, reconstructedArabic, sections };
}
