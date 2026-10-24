import { memo, useDeferredValue, useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { ColoredSegment } from '@/types/vocabulary.types';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { hasGrammarColour } from '@/utils/skiaParagraphBuilder';

import { SkiaColoredArabic } from './SkiaColoredArabic';

interface ColorCodedTextProps {
  text: string;
  arabicWord?: string;
  englishTranslation?: string;
  type?: 'heading1' | 'heading3' | 'body';
  weight?: 'bold' | 'semibold' | 'normal';
  style?: TextStyle;
  defaultColor?: string;
  isArabic?: boolean;
  precomputedSegments?: ColoredSegment[];
  /**
   * Point size for Arabic (`isArabic`). Arabic is painted by Skia rather than
   * `<Text>`, so it takes a number here instead of a `fontSize` in `style`.
   * Defaults to the user's Arabic reading size.
   */
  arabicFontSize?: number;
}

/**
 * Reusable component for rendering color-coded text based on Arabic word analysis
 * Used in WordDetailsBottomSheet and ArabicColoringExamples for consistent rendering
 *
 * For Arabic text (isArabic=true): Uses precomputed coloredSegments or dynamic analysis,
 * painted by Skia — see `SkiaColoredArabic` for why `<Text>` cannot do this.
 * For English text (isArabic=false): Uses generateColorCodedSegments (includes [the] if needed)
 */
export const ColorCodedText = memo<ColorCodedTextProps>(
  ({
    text,
    arabicWord = '',
    englishTranslation,
    type = 'body',
    weight = 'normal',
    style,
    defaultColor,
    isArabic = false,
    precomputedSegments,
    arabicFontSize,
  }) => {
    const colors = useColors();

    // React 19: Defer text analysis to keep tooltips responsive
    // Tooltip opens instantly, color-coding appears smoothly in background
    const deferredText = useDeferredValue(text);

    // Only run analysis if no precomputed segments and we have required data
    const shouldRunAnalysis =
      !precomputedSegments && !!(arabicWord && (englishTranslation || !isArabic));
    const {
      coloredSegments: dynamicSegments,
      formattedAnalysis,
      analysis,
    } = useArabicWordAnalysis(
      arabicWord,
      isArabic ? englishTranslation || '' : deferredText,
      shouldRunAnalysis,
    );

    // Arabic keeps its segments as-is — Skia takes {text, color} and does its own
    // painting, so none of the <Text> style plumbing below applies to it.
    const arabicSegments = precomputedSegments || dynamicSegments;

    // Generate color-coded segments for English
    // Pre-compute styles to avoid creating inline objects during render
    const coloredSegments = useMemo(() => {
      if (isArabic) return [];
      // For English text, use generateColorCodedSegments (includes [the] if appropriate)
      const segments = generateColorCodedSegments({
        text: deferredText,
        formattedAnalysis,
        analysis,
        colors,
        defaultColor: defaultColor || colors.text,
      });
      // Pre-compute segment styles to avoid inline object creation in render
      return segments.map(segment => ({
        ...segment,
        style: style ? [style, { color: segment.color }] : { color: segment.color },
      }));
    }, [isArabic, deferredText, formattedAnalysis, analysis, colors, defaultColor, style]);

    // Check if any segment has a non-default color
    const hasColoredComponents = useMemo(
      () => hasGrammarColour(coloredSegments, colors),
      [coloredSegments, colors],
    );

    // Arabic joins cursively, and a per-segment <Text> cannot: each nested Text
    // is its own shaping run on Android, so the letters come apart at every
    // colour boundary. Skia shapes first and colours the shaped glyphs.
    if (isArabic) {
      return (
        <SkiaColoredArabic
          text={text}
          segments={arabicSegments}
          fontSize={arabicFontSize}
          color={defaultColor}
        />
      );
    }

    // If no components detected, render plain text
    if (!hasColoredComponents) {
      return (
        <ThemedText type={type} weight={weight} style={style}>
          {text}
        </ThemedText>
      );
    }

    // Render color-coded segments
    return (
      <ThemedText type={type} weight={weight} style={style}>
        {coloredSegments.map(segment => (
          <ThemedText
            key={segment.key}
            type={type}
            weight={weight}
            skipDefaultColor
            style={segment.style}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  },
);

ColorCodedText.displayName = 'ColorCodedText';
