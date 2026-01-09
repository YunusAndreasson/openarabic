import { memo, useDeferredValue, useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { ColoredSegment } from '@/types/vocabulary.types';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';

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
}

/**
 * Reusable component for rendering color-coded text based on Arabic word analysis
 * Used in WordDetailsBottomSheet and WordTooltip for consistent rendering
 *
 * For Arabic text (isArabic=true): Uses precomputed coloredSegments or dynamic analysis
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

    // Generate color-coded segments based on text type
    // Pre-compute styles to avoid creating inline objects during render
    const coloredSegments = useMemo(() => {
      let segments: { text: string; color: string; key: string }[];
      if (isArabic) {
        // Use precomputed segments if available, otherwise use dynamic analysis
        const sourceSegments = precomputedSegments || dynamicSegments;
        segments = sourceSegments.map(segment => ({
          text: segment.text,
          color: segment.color,
          key: `${segment.type}-${segment.text}`,
        }));
      } else {
        // For English text, use generateColorCodedSegments (includes [the] if appropriate)
        segments = generateColorCodedSegments({
          text: deferredText,
          formattedAnalysis,
          analysis,
          colors,
          defaultColor: defaultColor || colors.text,
        });
      }
      // Pre-compute segment styles to avoid inline object creation in render
      return segments.map(segment => ({
        ...segment,
        style: style ? [style, { color: segment.color }] : { color: segment.color },
      }));
    }, [
      isArabic,
      precomputedSegments,
      dynamicSegments,
      deferredText,
      formattedAnalysis,
      analysis,
      colors,
      defaultColor,
      style,
    ]);

    // Check if any segment has a non-default color
    const hasColoredComponents = useMemo(
      () =>
        coloredSegments.length > 0 &&
        coloredSegments.some(seg => seg.color !== colors.text && seg.color !== colors.arabicText),
      [coloredSegments, colors.text, colors.arabicText],
    );

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
