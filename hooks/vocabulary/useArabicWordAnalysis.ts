import { useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import {
  analyzeArabicWord,
  formatWordAnalysis,
  normalizeArabic,
  shouldInjectBracket,
} from '@/utils/arabicWordAnalysis';
import { assertValidColorName, resolveColorName } from '@/utils/colorResolution';

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
      // Validate color name - throws if invalid (catches bugs early)
      assertValidColorName(segment.colorName);

      return {
        text: segment.text,
        color: resolveColorName(segment.colorName, colors),
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
