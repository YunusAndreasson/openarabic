import {
  ALL_WORD_COMPONENTS,
  COMPONENT_TYPE_CONFIG,
  type WordComponent,
} from '@/constants/arabicWordComponents';

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
  components: AnalyzedComponent[];
  hasComponents: boolean;
  remainingArabic: string;
  remainingEnglish: string;
}

/**
 * Normalizes Arabic text by removing diacritics and extra spaces
 */
function normalizeArabicText(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes English text for comparison
 */
function normalizeEnglishText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if English translation contains any of the expected patterns
 */
function checkEnglishMatch(englishText: string, patterns: string[]): string[] {
  const normalizedEnglish = normalizeEnglishText(englishText);
  const words = normalizedEnglish.split(/\s+/);
  const matches: string[] = [];

  for (const pattern of patterns) {
    const normalizedPattern = normalizeEnglishText(pattern);

    // Check for exact word match
    if (words.includes(normalizedPattern)) {
      matches.push(pattern);
      continue;
    }

    // Check for partial matches in compound translations
    if (normalizedEnglish.includes(normalizedPattern)) {
      matches.push(pattern);
    }
  }

  return matches;
}

/**
 * Removes matched Arabic component from the word
 */
function removeArabicComponent(arabic: string, component: WordComponent, _match: string): string {
  if (component.type === 'prefix') {
    return arabic.replace(new RegExp(component.arabic), '');
  } else if (component.type === 'suffix') {
    return arabic.replace(new RegExp(component.arabic), '');
  } else {
    // For common words, if it's an exact match, return empty string
    if (new RegExp(`^${component.arabic}$`).test(arabic)) {
      return '';
    }
    return arabic;
  }
}

/**
 * Removes matched English components from the translation
 */
function removeEnglishComponents(english: string, matches: string[]): string {
  let remaining = normalizeEnglishText(english);

  for (const match of matches) {
    const normalizedMatch = normalizeEnglishText(match);
    // Remove the matched word/phrase
    remaining = remaining.replace(new RegExp(`\\b${normalizedMatch}\\b`, 'g'), ' ');
  }

  return remaining.replace(/\s+/g, ' ').trim();
}

/**
 * Analyzes an Arabic word and its English translation to identify components
 */
export function analyzeArabicWord(arabic: string, english: string): WordAnalysis {
  const normalizedArabic = normalizeArabicText(arabic);
  const normalizedEnglish = normalizeEnglishText(english);

  const components: AnalyzedComponent[] = [];
  let remainingArabic = normalizedArabic;
  let remainingEnglish = normalizedEnglish;

  // Sort components by priority and process them
  for (const component of ALL_WORD_COMPONENTS) {
    const arabicRegex = new RegExp(component.arabic);
    const arabicMatch = remainingArabic.match(arabicRegex);

    if (arabicMatch) {
      const matchedText = arabicMatch[0];
      const englishMatches = checkEnglishMatch(english, component.english);
      const matchedInEnglish = englishMatches.length > 0;

      // Only include the component if we find some evidence in the English
      // or if it's a very common structural component
      if (matchedInEnglish || component.priority >= 95) {
        components.push({
          component,
          arabicMatch: matchedText,
          englishMatches,
          matchedInEnglish,
        });

        // Remove the matched component from remaining text
        remainingArabic = removeArabicComponent(remainingArabic, component, matchedText);
        if (matchedInEnglish) {
          remainingEnglish = removeEnglishComponents(remainingEnglish, englishMatches);
        }
      }
    }
  }

  return {
    original: {
      arabic,
      english,
    },
    components,
    hasComponents: components.length > 0,
    remainingArabic: remainingArabic.trim(),
    remainingEnglish: remainingEnglish.trim(),
  };
}

/**
 * Formats the analysis for display in the tooltip
 */
export function formatWordAnalysis(analysis: WordAnalysis): {
  title: string;
  sections: {
    type: 'original' | 'components' | 'root';
    content: string;
    arabicPart?: string;
    englishPart?: string;
    colorName?: string;
    icon?: string;
  }[];
} {
  const sections: {
    type: 'original' | 'components' | 'root';
    content: string;
    arabicPart?: string;
    englishPart?: string;
    colorName?: string;
    icon?: string;
  }[] = [];

  // Always show the original translation first
  sections.push({
    type: 'original',
    content: analysis.original.english,
  });

  // If we found components, show them with clear Arabic-to-English mapping
  if (analysis.hasComponents) {
    for (const analyzedComponent of analysis.components) {
      const config = COMPONENT_TYPE_CONFIG[analyzedComponent.component.type];
      const englishPart =
        analyzedComponent.englishMatches.length > 0
          ? analyzedComponent.englishMatches.join('/')
          : analyzedComponent.component.description;
      const arabicPart = analyzedComponent.arabicMatch;

      sections.push({
        type: 'components',
        content: `${arabicPart} ${config.icon} ${englishPart}`,
        arabicPart,
        englishPart,
        colorName: config.colorName,
        icon: config.icon,
      });
    }

    // If there's remaining content after removing components, show it as the root
    if (
      analysis.remainingEnglish &&
      analysis.remainingEnglish !== analysis.original.english.toLowerCase()
    ) {
      // Try to extract the remaining Arabic part
      let remainingArabicDisplay = analysis.remainingArabic;

      // If we have a good remaining Arabic part, show the mapping
      if (remainingArabicDisplay && remainingArabicDisplay.length > 0) {
        sections.push({
          type: 'root',
          content: `${remainingArabicDisplay} → ${analysis.remainingEnglish}`,
          arabicPart: remainingArabicDisplay,
          englishPart: analysis.remainingEnglish,
          colorName: 'textTertiary',
          icon: '→',
        });
      } else {
        // Fallback to just showing the English part
        sections.push({
          type: 'root',
          content: `● ${analysis.remainingEnglish}`,
          englishPart: analysis.remainingEnglish,
          colorName: 'textTertiary',
          icon: '●',
        });
      }
    }
  }

  return {
    title: analysis.original.arabic,
    sections,
  };
}

/**
 * Quick check if a word likely has analyzable components
 */
export function hasAnalyzableComponents(arabic: string): boolean {
  const normalized = normalizeArabicText(arabic);

  // Check for common prefixes and suffixes
  const quickPatterns = [
    /^ال/, // definite article
    /^و/, // and
    /^ف/, // so
    /^ب/, // with/by
    /^ل/, // to/for
    /ي$/, // my
    /ك$/, // your
    /ه$/, // his
    /ها$/, // her
    /نا$/, // our
    /كم$/, // your (plural)
    /هم$/, // their (masc)
    /هن$/, // their (fem)
    /ة$/, // feminine marker
  ];

  return quickPatterns.some(pattern => pattern.test(normalized));
}
