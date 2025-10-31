import { useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import {
  analyzeArabicWord,
  formatWordAnalysis,
  normalizeArabic,
  shouldInjectBracket,
} from '@/utils/arabicWordAnalysis';

interface ColoredSegment {
  text: string;
  color: string;
  type: 'prefix' | 'infix' | 'suffix' | 'diacritic' | 'root';
}

interface UseArabicWordAnalysisResult {
  /** Whether the word has analyzable components */
  hasComponents: boolean;
  /** Colored segments for rendering */
  coloredSegments: ColoredSegment[];
  /** Original analysis for detailed information */
  analysis: ReturnType<typeof analyzeArabicWord> | null;
  /** Formatted analysis for tooltip display */
  formattedAnalysis: ReturnType<typeof formatWordAnalysis> | null;
}

/**
 * Valid flat color names used by Arabic word analysis
 */
type FlatColorName = 'tint' | 'warning' | 'accent' | 'violet' | 'arabicText' | 'text';

/**
 * Valid grammar color names used for grammatical roles
 */
type GrammarColorName =
  | 'grammar.preposition'
  | 'grammar.possessive'
  | 'grammar.particle'
  | 'grammar.interrogative'
  | 'grammar.verbConjugation'
  | 'grammar.negation'
  | 'grammar.subjectPrefix'
  | 'grammar.plural'
  | 'grammar.demonstrative'
  | 'grammar.conjunction'
  | 'grammar.futureTense'
  | 'grammar.definiteArticle';

/**
 * All valid color names for Arabic word analysis
 */
type ValidColorName = FlatColorName | GrammarColorName;

/**
 * Type guard to validate color names
 * CRITICAL: This function throws an error if the color name is invalid
 * NO DEFAULT FALLBACK - we want to catch invalid color names immediately
 */
function assertValidColorName(colorName: string): asserts colorName is ValidColorName {
  const validFlatColors: FlatColorName[] = [
    'tint',
    'warning',
    'accent',
    'violet',
    'arabicText',
    'text',
  ];
  const validGrammarColors: GrammarColorName[] = [
    'grammar.preposition',
    'grammar.possessive',
    'grammar.particle',
    'grammar.interrogative',
    'grammar.verbConjugation',
    'grammar.negation',
    'grammar.subjectPrefix',
    'grammar.plural',
    'grammar.demonstrative',
    'grammar.conjunction',
    'grammar.futureTense',
    'grammar.definiteArticle',
  ];

  const isValid =
    validFlatColors.includes(colorName as FlatColorName) ||
    validGrammarColors.includes(colorName as GrammarColorName);

  if (!isValid) {
    throw new Error(
      `Invalid color name "${colorName}" in Arabic word analysis. ` +
        `Valid flat colors: ${validFlatColors.join(', ')}. ` +
        `Valid grammar colors: ${validGrammarColors.join(', ')}. ` +
        `This indicates a bug in the word analysis logic that must be fixed.`,
    );
  }
}

/**
 * Hook for analyzing Arabic words and providing color-coded segments
 * Memoizes results for performance and provides theme-aware colors
 */
export function useArabicWordAnalysis(
  arabicWord: string,
  englishTranslation: string,
  enabled = true,
): UseArabicWordAnalysisResult {
  const colors = useColors();

  // Memoize the analysis to prevent unnecessary recalculations
  const analysis = useMemo(() => {
    if (!enabled || !arabicWord || !englishTranslation) {
      return null;
    }

    // Normalize Arabic for bracket injection check (uses shared normalizeArabic with caching)
    const normalizedArabicWord = normalizeArabic(arabicWord);

    // Use shared bracket injection logic
    const hasBracketInjection = shouldInjectBracket(normalizedArabicWord, englishTranslation);

    // Inject "[the]" for Arabic words with definite article when appropriate
    // This helps users learn that "ال" = "the" even when not explicitly translated
    const processedEnglish = hasBracketInjection
      ? `[the] ${englishTranslation}`
      : englishTranslation;

    // Analyze word (single-word check happens inside analyzeArabicWord now)
    // analyzeArabicWord already returns hasBracketInjection in the result
    return analyzeArabicWord(arabicWord, processedEnglish);
  }, [arabicWord, englishTranslation, enabled]);

  // Memoize the formatted analysis
  const formattedAnalysis = useMemo(() => {
    if (!analysis?.hasComponents) {
      return null;
    }
    return formatWordAnalysis(analysis);
  }, [analysis]);

  // Convert analysis to colored segments
  const coloredSegments = useMemo((): ColoredSegment[] => {
    if (!analysis?.hasComponents || !formattedAnalysis?.reconstructedArabic) {
      // Return single segment with default color if no components
      return [
        {
          text: arabicWord,
          color: colors.text,
          type: 'root',
        },
      ];
    }

    const { segments } = formattedAnalysis.reconstructedArabic;

    return segments.map(segment => {
      // CRITICAL: Validate color name with strict type guard
      // This will throw an error if colorName is invalid - NO FALLBACK
      assertValidColorName(segment.colorName);

      // Resolve color from color name
      let color: string;
      if (segment.colorName.startsWith('grammar.')) {
        // Handle grammar colors (nested path like 'grammar.preposition')
        const grammarKey = segment.colorName.split('.')[1] as keyof typeof colors.grammar;
        color = colors.grammar[grammarKey];
      } else {
        // Handle flat colors - explicit property access for type safety
        const flatColorName = segment.colorName as FlatColorName;
        switch (flatColorName) {
          case 'tint':
            color = colors.tint;
            break;
          case 'warning':
            color = colors.warning;
            break;
          case 'accent':
            color = colors.accent;
            break;
          case 'violet':
            color = colors.violet;
            break;
          case 'arabicText':
            color = colors.arabicText;
            break;
          case 'text':
            color = colors.text;
            break;
          default:
            // This should never happen due to assertValidColorName
            color = colors.text;
        }
      }

      return {
        text: segment.text,
        color,
        type: segment.type as ColoredSegment['type'],
      };
    });
  }, [analysis, formattedAnalysis, arabicWord, colors]);

  return {
    hasComponents: analysis?.hasComponents ?? false,
    coloredSegments,
    analysis,
    formattedAnalysis,
  };
}
