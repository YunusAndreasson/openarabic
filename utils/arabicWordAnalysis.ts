import {
  ARABIC_PREFIXES,
  ARABIC_SUFFIXES,
  COMPONENT_TYPE_CONFIG,
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
  suffix?: AnalyzedComponent;
  hasComponents: boolean;
  remainingArabic: string;
  remainingEnglish: string;
}

/**
 * Normalizes Arabic text by removing diacritics
 */
function normalizeArabic(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06EE-\u06EF\u06FA-\u06FF]/g, '').trim();
}

/**
 * Normalizes English text for comparison
 */
function normalizeEnglish(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Checks if English contains any patterns
 */
function hasEnglishMatch(english: string, patterns: string[]): string[] {
  const normalized = normalizeEnglish(english);
  const words = normalized.split(/\s+/);
  return patterns.filter(p => words.includes(normalizeEnglish(p)));
}

/**
 * Finds longest prefix
 */
function findPrefix(arabic: string, english: string): AnalyzedComponent | undefined {
  let best: AnalyzedComponent | undefined;

  for (const prefix of ARABIC_PREFIXES) {
    const pattern = prefix.arabic.replace(/^\^/, '');
    if (arabic.startsWith(pattern)) {
      const matches = hasEnglishMatch(english, prefix.english);
      if (matches.length > 0 && (!best || pattern.length > best.arabicMatch.length)) {
        best = {
          component: prefix,
          arabicMatch: pattern,
          englishMatches: matches,
          matchedInEnglish: true,
        };
      }
    }
  }

  return best;
}

/**
 * Finds longest suffix
 */
function findSuffix(arabic: string, english: string): AnalyzedComponent | undefined {
  let best: AnalyzedComponent | undefined;

  for (const suffix of ARABIC_SUFFIXES) {
    const pattern = suffix.arabic.replace(/\$$/, '');
    if (arabic.endsWith(pattern)) {
      const matches = hasEnglishMatch(english, suffix.english);
      if (matches.length > 0 && (!best || pattern.length > best.arabicMatch.length)) {
        best = {
          component: suffix,
          arabicMatch: pattern,
          englishMatches: matches,
          matchedInEnglish: true,
        };
      }
    }
  }

  return best;
}

/**
 * Analyzes Arabic word for prefix/suffix
 */
export function analyzeArabicWord(arabic: string, english: string): WordAnalysis {
  const normalized = normalizeArabic(arabic);
  const prefix = findPrefix(normalized, english);
  const suffix = findSuffix(normalized, english);

  // Simple overlap handling - if they overlap, keep the longer one
  if (prefix && suffix) {
    const prefixEnd = prefix.arabicMatch.length;
    const suffixStart = normalized.length - suffix.arabicMatch.length;
    if (prefixEnd > suffixStart) {
      if (prefix.arabicMatch.length >= suffix.arabicMatch.length) {
        return {
          original: { arabic, english },
          prefix,
          suffix: undefined,
          hasComponents: true,
          remainingArabic: normalized.substring(prefix.arabicMatch.length),
          remainingEnglish: normalizeEnglish(english),
        };
      } else {
        return {
          original: { arabic, english },
          prefix: undefined,
          suffix,
          hasComponents: true,
          remainingArabic: normalized.substring(0, suffixStart),
          remainingEnglish: normalizeEnglish(english),
        };
      }
    }
  }

  let remaining = normalized;
  if (prefix) remaining = remaining.substring(prefix.arabicMatch.length);
  if (suffix) remaining = remaining.substring(0, remaining.length - suffix.arabicMatch.length);

  return {
    original: { arabic, english },
    prefix,
    suffix,
    hasComponents: !!(prefix || suffix),
    remainingArabic: remaining.trim(),
    remainingEnglish: normalizeEnglish(english),
  };
}

/**
 * Simple reconstruction for coloring
 */
function reconstructWithColors(analysis: WordAnalysis) {
  const segments: { text: string; colorName: string; type: string }[] = [];
  const { arabic } = analysis.original;

  let processed = 0;

  // Add prefix
  if (analysis.prefix) {
    const prefixLen = analysis.prefix.arabicMatch.length;
    // Map back to original with diacritics
    let originalEnd = 0;
    let count = 0;
    for (let i = 0; i < arabic.length && count < prefixLen; i++) {
      const char = arabic[i];
      if (char && !/[\u064B-\u065F\u0670\u06D6-\u06ED\u06EE-\u06EF\u06FA-\u06FF]/.test(char)) {
        count++;
      }
      originalEnd = i + 1;
    }

    segments.push({
      text: arabic.substring(0, originalEnd),
      colorName: COMPONENT_TYPE_CONFIG.prefix.colorName,
      type: 'prefix',
    });
    processed = originalEnd;
  }

  // Add suffix
  if (analysis.suffix) {
    const suffixLen = analysis.suffix.arabicMatch.length;
    // Map back from end
    let originalStart = arabic.length;
    let count = 0;
    for (let i = arabic.length - 1; i >= 0 && count < suffixLen; i--) {
      const char = arabic[i];
      if (char && !/[\u064B-\u065F\u0670\u06D6-\u06ED\u06EE-\u06EF\u06FA-\u06FF]/.test(char)) {
        count++;
      }
      originalStart = i;
    }

    // Add middle if needed
    if (originalStart > processed) {
      segments.push({
        text: arabic.substring(processed, originalStart),
        colorName: 'text',
        type: 'root',
      });
    }

    segments.push({
      text: arabic.substring(originalStart),
      colorName: COMPONENT_TYPE_CONFIG.suffix.colorName,
      type: 'suffix',
    });
  } else if (processed < arabic.length) {
    // Add remaining as root
    segments.push({
      text: arabic.substring(processed),
      colorName: 'text',
      type: 'root',
    });
  }

  // If no segments, add whole word
  if (segments.length === 0) {
    segments.push({ text: arabic, colorName: 'text', type: 'root' });
  }

  return { segments, totalText: arabic };
}

/**
 * Formats analysis for tooltip
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
      colorName: COMPONENT_TYPE_CONFIG.prefix.colorName,
      icon: COMPONENT_TYPE_CONFIG.prefix.icon,
    });
  }

  if (analysis.suffix) {
    sections.push({
      type: 'components',
      arabicPart: analysis.suffix.arabicMatch,
      englishPart: analysis.suffix.englishMatches.join(' / '),
      colorName: COMPONENT_TYPE_CONFIG.suffix.colorName,
      icon: COMPONENT_TYPE_CONFIG.suffix.icon,
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
