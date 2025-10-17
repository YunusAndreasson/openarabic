import {
  ARABIC_DIACRITICS,
  ARABIC_INFIXES,
  ARABIC_PREFIXES,
  ARABIC_SUFFIXES,
  COMPONENT_TYPE_CONFIG,
  ComponentType,
  type WordComponent,
} from '@/constants/arabicWordComponents';
import type { ColoredSegment } from '@/types/vocabulary.types';

export interface AnalyzedComponent {
  component: WordComponent;
  arabicMatch: string;
  englishMatches: string[];
  matchedInEnglish: boolean;
}

export interface WordAnalysis {
  original: {
    arabic: string;
    english: string;
  };
  prefix?: AnalyzedComponent;
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

  // LRU cache management - evict oldest entry when cache is full
  if (ARABIC_NORMALIZATION_CACHE.size >= CACHE_SIZE_LIMIT) {
    const firstKey = ARABIC_NORMALIZATION_CACHE.keys().next().value;
    if (firstKey) {
      ARABIC_NORMALIZATION_CACHE.delete(firstKey);
    }
  }
  ARABIC_NORMALIZATION_CACHE.set(text, normalized);

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

  // LRU cache management - evict oldest entry when cache is full
  if (ENGLISH_NORMALIZATION_CACHE.size >= CACHE_SIZE_LIMIT) {
    const firstKey = ENGLISH_NORMALIZATION_CACHE.keys().next().value;
    if (firstKey) {
      ENGLISH_NORMALIZATION_CACHE.delete(firstKey);
    }
  }
  ENGLISH_NORMALIZATION_CACHE.set(text, normalized);

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
    // Remove regex anchors to get the actual pattern
    const pattern = component.arabic.replace(/[\^$]/g, '');

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
      if (pattern === 'ي' || pattern === 'ت' || pattern === 'أ' || pattern === 'ن') {
        const remaining = arabic.slice(pattern.length);
        const minLengthSatisfied = remaining.length >= 3;
        const consonants = remaining.split('').filter(ch => !['ا', 'و', 'ي'].includes(ch));
        const hasTwoConsonants = consonants.length >= 2;
        if (!minLengthSatisfied || !hasTwoConsonants) {
          matches = false;
        }
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
 */
function findInfix(remainingArabic: string, english: string): AnalyzedComponent | undefined {
  return findComponent(remainingArabic, english, ARABIC_INFIXES, ComponentType.INFIX);
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

  // Check for bracket injection using shared logic
  const hasBracketInjection = shouldInjectBracket(normalized, english);

  // Check for diacritical prefixes in original text first (before normalization)
  const diacriticalPrefix = findComponent(arabic, english, ARABIC_PREFIXES, ComponentType.PREFIX);

  // Check for regular prefixes in normalized text
  const normalizedPrefix = findComponent(
    normalized,
    english,
    ARABIC_PREFIXES,
    ComponentType.PREFIX
  );

  // Use diacritical prefix if it's longer (more specific) than normalized prefix
  const prefix =
    diacriticalPrefix && normalizedPrefix
      ? diacriticalPrefix.arabicMatch.length > normalizedPrefix.arabicMatch.length
        ? diacriticalPrefix
        : normalizedPrefix
      : diacriticalPrefix || normalizedPrefix;

  const suffix = findComponent(normalized, english, ARABIC_SUFFIXES, ComponentType.SUFFIX);

  // Check for diacritics in the original text (before normalization)
  const diacritic = findDiacritic(arabic, english);

  // Resolve overlaps between prefix and suffix
  const { resolvedPrefix, resolvedSuffix } = resolveOverlap(normalized, prefix, suffix);

  // Calculate remaining Arabic text after removing prefix and suffix
  let remaining = normalized;
  if (resolvedPrefix) remaining = remaining.substring(resolvedPrefix.arabicMatch.length);
  if (resolvedSuffix)
    remaining = remaining.substring(0, remaining.length - resolvedSuffix.arabicMatch.length);

  // Look for infixes in the remaining text
  const infix = remaining.length > 2 ? findInfix(remaining, english) : undefined;

  const result: WordAnalysis = {
    original: { arabic, english },
    prefix: resolvedPrefix,
    infix,
    suffix: resolvedSuffix,
    diacritic,
    hasComponents: !!(resolvedPrefix || infix || resolvedSuffix || diacritic),
    remainingArabic: remaining.trim(),
    remainingEnglish: normalizeEnglish(english),
    hasBracketInjection,
  };

  // Cache the result and manage cache size
  if (ANALYSIS_CACHE.size >= CACHE_SIZE_LIMIT) {
    const firstKey = ANALYSIS_CACHE.keys().next().value;
    if (firstKey) {
      ANALYSIS_CACHE.delete(firstKey);
    }
  }
  ANALYSIS_CACHE.set(cacheKey, result);

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
 * Optimized reconstruction for coloring with infix and diacritic support
 */
function reconstructWithColors(analysis: WordAnalysis) {
  const segments: { text: string; colorName: string; type: string }[] = [];
  const { arabic } = analysis.original;
  let processed = 0;

  // Add prefix segment
  if (analysis.prefix) {
    const originalEnd = mapToOriginalPosition(arabic, analysis.prefix.arabicMatch.length);
    segments.push({
      text: arabic.substring(0, originalEnd),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.PREFIX].colorName,
      type: 'prefix',
    });
    processed = originalEnd;
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
        colorName: 'text',
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
        colorName: 'text',
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
          colorName: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].colorName,
          type: 'suffix',
        });
      }
      segments.push({
        text: analysis.diacritic.arabicMatch,
        colorName: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName,
        type: 'diacritic',
      });
    } else {
      segments.push({
        text: suffixText,
        colorName: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].colorName,
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
        colorName: 'text',
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
            colorName: 'text',
            type: 'root',
          });
        }
        segments.push({
          text: analysis.diacritic.arabicMatch,
          colorName: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName,
          type: 'diacritic',
        });
      } else {
        segments.push({
          text: postInfixText,
          colorName: 'text',
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
        colorName: 'text',
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
          colorName: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].colorName,
          type: 'suffix',
        });
      }
      segments.push({
        text: analysis.diacritic.arabicMatch,
        colorName: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName,
        type: 'diacritic',
      });
    } else {
      segments.push({
        text: suffixText,
        colorName: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].colorName,
        type: 'suffix',
      });
    }
  } else if (processed < arabic.length) {
    // Add remaining text as root (handle diacritic separately if it exists)
    let remainingText = arabic.substring(processed);
    if (analysis.diacritic && remainingText.endsWith(analysis.diacritic.arabicMatch)) {
      const rootWithoutDiacritic = remainingText.substring(
        0,
        remainingText.length - analysis.diacritic.arabicMatch.length
      );
      if (rootWithoutDiacritic) {
        segments.push({
          text: rootWithoutDiacritic,
          colorName: 'text',
          type: 'root',
        });
      }
      segments.push({
        text: analysis.diacritic.arabicMatch,
        colorName: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName,
        type: 'diacritic',
      });
    } else {
      segments.push({
        text: remainingText,
        colorName: 'text',
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
        colorName: 'text',
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
    segments.push({ text: arabic, colorName: 'text', type: 'root' });
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
  colors: { tint: string; primary: string; warning: string; secondaryText: string; text: string }
): ColoredSegment[] {
  // Check single-word rule
  const normalizedArabic = normalizeArabic(arabicWord);
  const processedEnglish = shouldInjectBracket(normalizedArabic, englishTranslation)
    ? `[the] ${englishTranslation}`
    : englishTranslation;

  const wordCount = processedEnglish.trim().split(/\s+/).length;
  if (wordCount === 1) {
    return [{ text: arabicWord, color: colors.text, type: 'root' as const }];
  }

  const analysis = analyzeArabicWord(arabicWord, processedEnglish);

  if (!analysis?.hasComponents) {
    return [{ text: arabicWord, color: colors.text, type: 'root' as const }];
  }

  const formatted = formatWordAnalysis(analysis);
  if (!formatted?.reconstructedArabic) {
    return [{ text: arabicWord, color: colors.text, type: 'root' as const }];
  }

  const colorMap: Record<string, string> = {
    tint: colors.tint,
    primary: colors.primary,
    warning: colors.warning,
    secondaryText: colors.secondaryText,
    text: colors.text,
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
  const title = `${analysis.original.arabic} → ${analysis.original.english}`;
  const reconstructedArabic = analysis.hasComponents ? reconstructWithColors(analysis) : undefined;

  const sections: {
    type: 'original' | 'components' | 'root';
    content?: string;
    arabicPart?: string;
    englishPart?: string;
    colorName?: string;
    icon?: string;
  }[] = [{ type: 'original', content: analysis.original.english }];

  if (analysis.prefix) {
    sections.push({
      type: 'components',
      arabicPart: analysis.prefix.arabicMatch,
      englishPart: analysis.prefix.englishMatches.join(' / '),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.PREFIX].colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.PREFIX].icon,
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
    sections.push({
      type: 'components',
      arabicPart: analysis.suffix.arabicMatch,
      englishPart: analysis.suffix.englishMatches.join(' / '),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].icon,
    });
  }

  if (analysis.diacritic) {
    sections.push({
      type: 'components',
      arabicPart: analysis.diacritic.arabicMatch,
      englishPart: analysis.diacritic.englishMatches.join(' / '),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName,
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
