import { useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import { analyzeArabicWord, formatWordAnalysis, shouldInjectBracket } from '@/utils/arabicWordAnalysis';

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
  enabled = true
): UseArabicWordAnalysisResult {
  const colors = useColors();

  // Memoize the analysis to prevent unnecessary recalculations
  const analysis = useMemo(() => {
    if (!enabled || !arabicWord || !englishTranslation) {
      return null;
    }

    let processedEnglish = englishTranslation;

    // Normalize Arabic for bracket injection check (remove diacritics)
    const normalizedArabic = arabicWord.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

    // Use shared bracket injection logic
    const hasBracketInjection = shouldInjectBracket(normalizedArabic, englishTranslation);

    // Inject "[the]" for Arabic words with definite article when appropriate
    // This helps users learn that "ال" = "the" even when not explicitly translated
    if (hasBracketInjection) {
      processedEnglish = `[the] ${englishTranslation}`;
    }

    // CRITICAL RULE: Single English words should NEVER have grammar color-coding applied
    // Check the processed English translation word count before doing any analysis
    const wordCount = processedEnglish.trim().split(/\s+/).length;
    if (wordCount === 1) {
      // Return null analysis to prevent color-coding for single words
      return null;
    }

    const wordAnalysis = analyzeArabicWord(arabicWord, processedEnglish);

    // Add bracket injection flag to the analysis
    return wordAnalysis ? { ...wordAnalysis, hasBracketInjection } : null;
  }, [arabicWord, englishTranslation, enabled]);

  // Memoize the formatted analysis
  const formattedAnalysis = useMemo(() => {
    if (!analysis?.hasComponents) {
      return null;
    }
    return formatWordAnalysis(analysis);
  }, [analysis]);

  // Create color mapping
  const colorMap = useMemo(
    () => ({
      tint: colors.tint,
      primary: colors.primary,
      warning: colors.warning,
      secondaryText: colors.secondaryText,
      text: colors.text,
    }),
    [colors.tint, colors.primary, colors.warning, colors.secondaryText, colors.text]
  );

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
      // Map color names to valid keys
      const colorName = segment.colorName as
        | 'tint'
        | 'primary'
        | 'warning'
        | 'secondaryText'
        | 'text';
      return {
        text: segment.text,
        color: colorMap[colorName] || colors.text,
        type: segment.type as ColoredSegment['type'],
      };
    });
  }, [analysis, formattedAnalysis, arabicWord, colors.text, colorMap]);

  return {
    hasComponents: analysis?.hasComponents ?? false,
    coloredSegments,
    analysis,
    formattedAnalysis,
  };
}
