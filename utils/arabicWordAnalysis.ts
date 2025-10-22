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
  prefixes: AnalyzedComponent[];  // Changed from prefix?: AnalyzedComponent to support multiple prefixes
  infix?: AnalyzedComponent;
  suffix?: AnalyzedComponent;
  diacritic?: AnalyzedComponent;
  hasComponents: boolean;
  remainingArabic: string;
  remainingEnglish: string;
  hasBracketInjection?: boolean;
}

/**
 * Pre-compiled regex for Arabic diacritical marks
 *
 * Includes:
 * - \u064B-\u065F: Arabic diacritics (fatha, kasra, damma, tanween, sukun, shadda, etc.)
 * - \u0670: Arabic letter superscript alef
 * - \u06D6-\u06ED: Arabic small high ligature sad/qaf/alef, etc.
 *
 * Excludes:
 * - \u06EE-\u06EF: Letterforms (not diacritics)
 * - \u06FA-\u06FF: Extended Arabic letters (not diacritics)
 */
const DIACRITIC_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

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
  limit: number = CACHE_SIZE_LIMIT
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
  SUBJECT_MARKERS: ['ي', 'ت', 'ن', 'أ'] as const,

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
    MIN_REMAINING_LENGTH: 3,
    MIN_CONSONANTS: 2,
    /** Extra length required if remaining starts with subject marker (accounts for prefix + 3-char root) */
    HIDDEN_PREFIX_MIN_LENGTH: 4,
  } as const,
} as const;

/**
 * Validation helper functions - reusable building blocks for structural validation
 */

/**
 * Check if a character is a weak letter (often used as vowel in Arabic)
 */
function isWeakLetter(char: string): boolean {
  return VALIDATION_CONFIG.WEAK_LETTERS.includes(char as (typeof VALIDATION_CONFIG.WEAK_LETTERS)[number]);
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
function hasSubstantialStructure(
  text: string,
  minLength: number,
  minConsonants: number
): boolean {
  return text.length >= minLength && countConsonants(text) >= minConsonants;
}

/**
 * Check if a pattern is a subject marker prefix (ي، ت، ن، أ)
 */
function isSubjectMarker(pattern: string): boolean {
  return VALIDATION_CONFIG.SUBJECT_MARKERS.includes(pattern as (typeof VALIDATION_CONFIG.SUBJECT_MARKERS)[number]);
}

/**
 * Check if a pattern is a high-risk suffix requiring validation
 */
function isHighRiskSuffix(pattern: string): boolean {
  return VALIDATION_CONFIG.HIGH_RISK_SUFFIXES.includes(pattern as (typeof VALIDATION_CONFIG.HIGH_RISK_SUFFIXES)[number]);
}

// Comprehensive contraction map hoisted and lowercased once for reuse
const CONTRACTION_MAP: Record<string, string> = {
  // Negation contractions
  "won't": 'will not',
  "can't": 'cannot',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "hadn't": 'had not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "couldn't": 'could not',
  "mustn't": 'must not',
  "mightn't": 'might not',
  "shan't": 'shall not',

  // "Will" contractions
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "we'll": 'we will',
  "they'll": 'they will',

  // "Be" verb contractions
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',

  // "Have" contractions
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',

  // "Would/Had" contractions
  "i'd": 'i would',
  "you'd": 'you would',
  "he'd": 'he would',
  "she'd": 'she would',
  "we'd": 'we would',
  "they'd": 'they would',

  // "Let" contractions
  "let's": 'let us',

  // "That/What/Where/etc" contractions
  "that's": 'that is',
  "there's": 'there is',
  "here's": 'here is',
  "what's": 'what is',
  "who's": 'who is',
  "where's": 'where is',
  "when's": 'when is',
  "why's": 'why is',
  "how's": 'how is',
};

/**
 * Normalizes Arabic text by removing diacritics and Unicode formatting characters (with caching)
 */
function normalizeArabic(text: string): string {
  const cached = ARABIC_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // Remove Unicode formatting characters (RTL marks, zero-width characters, etc.)
  // then remove diacritics, then trim
  const normalized = text
    .replace(UNICODE_FORMAT_REGEX, '')
    .replace(DIACRITIC_REGEX, '')
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
  componentPattern?: string
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
  componentPattern?: string
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
    if (shouldRejectWholeTranslationMatch(candidate, norm, tokens.length, arabicWord, componentPattern)) {
      continue;
    }

    if (candidate.includes(' ')) {
      // Lazily build bigrams/trigrams when needed
      if (bigrams === null || trigrams === null) {
        bigrams = new Set(
          tokens
            .map((_, i) => (i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : ''))
            .filter(Boolean)
        );
        trigrams = new Set(
          tokens
            .map((_, i) =>
              i + 2 < tokens.length ? `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}` : ''
            )
            .filter(Boolean)
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
  type: ComponentType
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
        if (!hasSubstantialStructure(
          remaining,
          VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_REMAINING_LENGTH,
          VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_CONSONANTS
        )) {
          matches = false;
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

          // Additional check: If remaining starts with a SUBJECT MARKER and is exactly 3 chars,
          // the root is only 2 chars (not enough)
          // Example: يكره → remove ه → يكر (3 chars starting with ي prefix = 2 char root)
          // NOTE: Only check subject markers (ي، ت، ن، أ) which are rarely root-initial
          // Don't check ل، ب، ك، و، ف which commonly appear in roots (e.g., لذة، بذر، كره)
          const startsWithSubjectMarker = isSubjectMarker(remaining.charAt(0));
          const hasHiddenPrefix = startsWithSubjectMarker && remaining.length === 3;

          // Minimum length check: need at least 3 characters for legitimate suffix attachment
          // OR 4+ if it starts with a prefix letter (to account for prefix + 3-char root)
          // This distinguishes "كتابه" (4 chars → كتاب) from "كره" (3 chars → كر)
          const minLengthRequired = hasHiddenPrefix
            ? VALIDATION_CONFIG.SUFFIX_VALIDATION.HIDDEN_PREFIX_MIN_LENGTH
            : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_REMAINING_LENGTH;

          const minLengthSatisfied = remaining.length >= minLengthRequired;
          const hasTwoConsonants = countConsonants(remaining) >= VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS;

          // فعيل pattern detection: words like سفيه، كريه (root ends in ه with ي before it)
          // Pattern: C¹ C² ي ه → likely فعيل adjectival form where ه is root letter
          // Exception: Don't apply to known prepositions that take suffixes (على، لدى، إلى)
          const potentialFa3eelPattern = pattern === 'ه' &&
                                         remaining.length === 3 &&
                                         remaining.charAt(2) === 'ي';

          // Check if remaining is a known preposition ending in ى that takes suffixes
          const isKnownPreposition = (VALIDATION_CONFIG.PREPOSITIONS_WITH_SUFFIXES as readonly string[]).includes(remaining);

          // Only reject as فعيل if it's not a known preposition
          const isFa3eelPattern = potentialFa3eelPattern && !isKnownPreposition;

          if (!minLengthSatisfied || !hasTwoConsonants || isFa3eelPattern) {
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
  suffix: AnalyzedComponent | undefined
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
  suffix?: AnalyzedComponent
): AnalyzedComponent | undefined {
  const result = findComponent(remainingArabic, english, ARABIC_INFIXES, ComponentType.INFIX);

  // Filter out false positives: infix matches that are already claimed by prefixes/suffix
  if (result) {
    const claimedWords = new Set<string>();

    // Collect all English words claimed by all prefixes
    prefixes.forEach(prefix => {
      prefix.englishMatches.forEach(match => {
        match.toLowerCase().split(/\s+/).forEach(word => claimedWords.add(word));
      });
    });

    // Collect all English words claimed by suffix
    if (suffix) {
      suffix.englishMatches.forEach(match => {
        match.toLowerCase().split(/\s+/).forEach(word => claimedWords.add(word));
      });
    }

    // Check if ALL infix English matches are already claimed
    const allClaimed = result.englishMatches.every(match =>
      match.toLowerCase().split(/\s+/).every(word => claimedWords.has(word))
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
export function shouldInjectBracket(
  normalizedArabic: string,
  englishTranslation: string
): boolean {
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
  otherComponents: Array<AnalyzedComponent | undefined>
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
  overlappingMatches: string[]
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
 * Detect multiple prefixes sequentially from an Arabic word
 * Returns array of detected prefixes with their grammatical roles and the remaining Arabic text
 */
function detectPrefixes(
  normalizedArabic: string,
  english: string
): { prefixes: AnalyzedComponent[]; remainingArabic: string } {
  const detectedPrefixes: AnalyzedComponent[] = [];
  let remaining = normalizedArabic;

  // Keep trying to find prefixes until none are found
  // This allows detecting multiple prefixes in sequence (e.g., و + ال + ب)
  let continueDetection = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops

  while (continueDetection && iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    const prefixMatch = findComponent(remaining, english, ARABIC_PREFIXES, ComponentType.PREFIX);

    if (prefixMatch) {
      // Extract role from the matched component
      const role = prefixMatch.component.role || GrammaticalRole.GENERIC;

      // Create analyzed component with role and position
      const analyzedPrefix: AnalyzedComponent = {
        ...prefixMatch,
        role,
        position: detectedPrefixes.length,
      };

      detectedPrefixes.push(analyzedPrefix);

      // Remove matched prefix from remaining text
      remaining = remaining.substring(prefixMatch.arabicMatch.length);

      // If remaining text is too short, stop
      if (remaining.length < 2) {
        continueDetection = false;
      }
    } else {
      // No more prefixes found
      continueDetection = false;
    }
  }

  return { prefixes: detectedPrefixes, remainingArabic: remaining };
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
      prefixes: [],  // No prefixes for single words
      hasComponents: false,
      remainingArabic: normalized,
      remainingEnglish: normalizeEnglish(english),
      hasBracketInjection,
    };

    cacheWithLRUEviction(ANALYSIS_CACHE, cacheKey, singleWordResult);

    return singleWordResult;
  }

  // Detect multiple prefixes sequentially
  const { prefixes: detectedPrefixes, remainingArabic: remainingAfterPrefixes } = detectPrefixes(normalized, english);

  const suffix = findComponent(normalized, english, ARABIC_SUFFIXES, ComponentType.SUFFIX);

  // Check for diacritics in the original text (before normalization)
  const diacritic = findDiacritic(arabic, english);

  // Resolve overlaps between the last prefix and suffix (only last prefix can overlap with suffix)
  const lastPrefix = detectedPrefixes.length > 0 ? detectedPrefixes[detectedPrefixes.length - 1] : undefined;
  const { resolvedPrefix, resolvedSuffix } = resolveOverlap(normalized, lastPrefix, suffix);

  // If last prefix was removed due to overlap, remove it from the detected prefixes array
  let finalPrefixes = detectedPrefixes;
  if (lastPrefix && !resolvedPrefix) {
    finalPrefixes = detectedPrefixes.slice(0, -1);
  }

  // Calculate remaining Arabic text after removing all prefixes and suffix
  let remaining = remainingAfterPrefixes;  // Already has prefixes removed
  if (resolvedSuffix)
    remaining = remaining.substring(0, remaining.length - resolvedSuffix.arabicMatch.length);

  // Look for infixes in the remaining text (pass all prefixes/suffix to filter false positives)
  const infix = remaining.length > 2 ? findInfix(remaining, english, finalPrefixes, resolvedSuffix) : undefined;

  // Smart diacritic resolution: filter, keep, or merge colors based on grammatical relationships
  let resolvedDiacritic: AnalyzedComponent | undefined;

  if (diacritic) {
    const matchAnalysis = analyzeDiacriticMatches(diacritic.englishMatches, [
      ...finalPrefixes,  // Include all prefixes
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
        matchAnalysis.overlappingMatches
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

  const result: WordAnalysis = {
    original: { arabic, english },
    prefixes: finalPrefixes,  // Array of prefixes
    infix,
    suffix: resolvedSuffix,
    diacritic: resolvedDiacritic,
    hasComponents: !!(finalPrefixes.length > 0 || infix || resolvedSuffix || resolvedDiacritic),
    remainingArabic: remaining.trim(),
    remainingEnglish: normalizeEnglish(english),
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
  fromEnd = false
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
function getDiacriticColorName(diacritic: AnalyzedComponent | undefined, analysis?: WordAnalysis): string {
  if (!diacritic) return 'text';

  // If diacritic inherits color from a related component, use that component's color logic
  if (diacritic.inheritColorFrom === ComponentType.SUFFIX && analysis?.suffix) {
    // Match suffix color logic: use role-based color if available, otherwise type-based
    return getComponentColorName(analysis.suffix, ComponentType.SUFFIX);
  }

  if (diacritic.inheritColorFrom === ComponentType.PREFIX && analysis?.prefixes) {
    // Match prefix color logic: also uses role-based colors
    const prefix = analysis.prefixes[0];  // Get first prefix (most relevant for diacritic)
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
  defaultType: ComponentType
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
        const mappedEnd = mapToOriginalPosition(arabic.substring(processed), prefixLength) + processed;
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
      true
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
      infixIndex + analysis.infix.arabicMatch.length
    );
    segments.push({
      text: remainingText.substring(
        infixIndex > 0 ? mapToOriginalPosition(remainingText, infixIndex) : 0,
        infixEnd
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
        suffixText.length - analysis.diacritic.arabicMatch.length
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
      infixIndex + analysis.infix.arabicMatch.length
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
          postInfixText.length - analysis.diacritic.arabicMatch.length
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
        suffixText.length - analysis.diacritic.arabicMatch.length
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
        remainingText.length - analysis.diacritic.arabicMatch.length
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
      arabic.length - analysis.diacritic.arabicMatch.length
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
  colors: { tint: string; primary: string; secondary: string; secondaryText: string; warning: string; accent: string; violet: string; error: string; text: string; arabicText: string }
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
    accent: colors.accent,
    violet: colors.violet,
    error: colors.error,
    text: colors.text,
    arabicText: colors.arabicText,
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
    analysis.prefixes.forEach((prefix) => {
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
