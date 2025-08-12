import {
  ARABIC_DIACRITICS,
  ARABIC_INFIXES,
  ARABIC_PREFIXES,
  ARABIC_SUFFIXES,
  COMPONENT_TYPE_CONFIG,
  ComponentType,
  type WordComponent,
} from '../constants/arabicWordComponents';

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
}

// Pre-compiled regex patterns for better performance
// Only include Arabic combining marks and superscript alef; exclude letter ranges (e.g., 06EE-06EF, 06FA-06FF)
const DIACRITIC_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const NON_WORD_REGEX = /[^\w\s]/g;
const WHITESPACE_REGEX = /\s+/;

// Separate caches for Arabic and English normalization to avoid contention
const ARABIC_NORMALIZATION_CACHE = new Map<string, string>();
const ENGLISH_NORMALIZATION_CACHE = new Map<string, string>();
const CACHE_SIZE_LIMIT = 100;

// Contraction map hoisted and lowercased once for reuse
const CONTRACTION_MAP: Record<string, string> = {
  "won't": 'will not',
  "can't": 'cannot',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  // common "will" contractions
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "we'll": 'we will',
  "they'll": 'they will',
  // be verb contractions
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',
};

/**
 * Normalizes Arabic text by removing diacritics (with caching)
 */
function normalizeArabic(text: string): string {
  const cached = ARABIC_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = text.replace(DIACRITIC_REGEX, '').trim();

  // Simple cache management - clear when too large
  if (ARABIC_NORMALIZATION_CACHE.size >= CACHE_SIZE_LIMIT) {
    ARABIC_NORMALIZATION_CACHE.clear();
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

  // Simple cache management - clear when too large
  if (ENGLISH_NORMALIZATION_CACHE.size >= CACHE_SIZE_LIMIT) {
    ENGLISH_NORMALIZATION_CACHE.clear();
  }
  ENGLISH_NORMALIZATION_CACHE.set(text, normalized);

  return normalized;
}

/**
 * Optimized function to check if English contains any patterns
 */
function hasEnglishMatch(english: string, patterns: string[]): string[] {
  const norm = normalizeEnglish(english);
  const tokens = norm.split(WHITESPACE_REGEX).filter(Boolean);

  // Build unigram set for fast membership checks
  const unigrams = new Set(tokens);
  let bigrams: Set<string> | null = null;
  let trigrams: Set<string> | null = null;

  // Simple contraction/variant expansion for common English phrases
  const expand = (phrase: string): string[] => {
    const p = normalizeEnglish(phrase);
    const variants = [p];
    // Look up in hoisted mapping using the original lowercased phrase
    const lowerOriginal = phrase.toLowerCase();
    if (CONTRACTION_MAP[lowerOriginal]) {
      variants.push(normalizeEnglish(CONTRACTION_MAP[lowerOriginal]));
    }
    return variants;
  };

  const matches: string[] = [];
  for (const raw of patterns) {
    const candidates = expand(raw);
    for (const candidate of candidates) {
      if (candidate.includes(' ')) {
        // Lazily build bigrams/trigrams when needed
        if (!bigrams || !trigrams) {
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
        if (bigrams.has(candidate) || trigrams.has(candidate)) {
          matches.push(raw);
          break;
        }
      } else {
        if (unigrams.has(candidate)) {
          matches.push(raw);
          break;
        }
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
    const pattern = component.arabic.replace(/^\^|\$$/g, '');

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

    // Heuristic disambiguation for very short subject markers to avoid false positives
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
      const englishMatches = hasEnglishMatch(english, component.english);
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
 * Simplified overlap resolution - keeps the longer component
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
 * Main function to analyze an Arabic word and its English translation for components
 */
export function analyzeArabicWord(arabic: string, english: string): WordAnalysis {
  const normalized = normalizeArabic(arabic);

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

  return {
    original: { arabic, english },
    prefix: resolvedPrefix,
    infix,
    suffix: resolvedSuffix,
    diacritic,
    hasComponents: !!(resolvedPrefix || infix || resolvedSuffix || diacritic),
    remainingArabic: remaining.trim(),
    remainingEnglish: normalizeEnglish(english),
  };
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
    for (let i = 0; i < original.length && count < normalizedLength; i++) {
      const char = original[i];
      if (char && !DIACRITIC_REGEX.test(char)) {
        count++;
      }
      position = i + 1;
    }
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
