import { useColors } from '@/hooks/theme/useColors';
import type { ColoredSegment } from '@/types/vocabulary.types';
import {
  analyzeArabicWord,
  formatWordAnalysis,
  normalizeArabic,
  shouldInjectBracket,
} from '@/utils/arabicWordAnalysis';
import { resolveColorName } from '@/utils/colorResolution';

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
 * React Compiler auto-memoizes these derivations
 */
export function useArabicWordAnalysis(
  arabicWord: string,
  englishTranslation: string,
  enabled = true,
): UseArabicWordAnalysisResult {
  const colors = useColors();

  // Derive analysis from inputs
  const analysis = (() => {
    if (!enabled || !arabicWord || !englishTranslation) return null;

    const normalizedArabicWord = normalizeArabic(arabicWord);
    const hasBracketInjection = shouldInjectBracket(
      normalizedArabicWord,
      englishTranslation,
      arabicWord,
    );
    const processedEnglish = hasBracketInjection
      ? `[the] ${englishTranslation}`
      : englishTranslation;

    return analyzeArabicWord(arabicWord, processedEnglish);
  })();

  const formattedAnalysis = analysis?.hasComponents ? formatWordAnalysis(analysis) : null;

  const coloredSegments: ColoredSegment[] = (() => {
    if (!analysis?.hasComponents || !formattedAnalysis?.reconstructedArabic) {
      return [{ text: arabicWord, color: colors.text, type: 'root' as const }];
    }

    return formattedAnalysis.reconstructedArabic.segments.map(segment => ({
      text: segment.text,
      color: resolveColorName(segment.colorName, colors),
      type: segment.type,
    }));
  })();

  return {
    hasComponents: analysis?.hasComponents ?? false,
    coloredSegments,
    analysis,
    formattedAnalysis,
  };
}
