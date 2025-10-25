import { memo, useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';

interface ColorCodedTextProps {
  text: string;
  arabicWord?: string;
  englishTranslation?: string; // English translation needed for analysis
  type?: 'heading1' | 'heading3' | 'body';
  weight?: 'bold' | 'semibold' | 'normal';
  style?: TextStyle;
  defaultColor?: string;
  isArabic?: boolean; // True if rendering Arabic text (uses coloredSegments), false for English (uses generateColorCodedSegments)
}

/**
 * Reusable component for rendering color-coded text based on Arabic word analysis
 * Used in WordDetailsBottomSheet and WordTooltip for consistent rendering
 *
 * For Arabic text (isArabic=true): Uses coloredSegments from analysis (no [the] injection)
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
  }) => {
    const colors = useColors();

    // Use Arabic word analysis for color-coding
    // For Arabic rendering: pass englishTranslation to enable analysis
    // For English rendering: pass the text itself as translation
    const translationForAnalysis = isArabic ? englishTranslation || '' : text;
    const {
      hasComponents,
      coloredSegments: arabicSegments,
      formattedAnalysis,
      analysis,
    } = useArabicWordAnalysis(
      arabicWord,
      translationForAnalysis,
      !!(arabicWord && translationForAnalysis),
    );

    // Generate color-coded segments based on text type
    const coloredSegments = useMemo(() => {
      if (isArabic) {
        // For Arabic text, use the coloredSegments directly (no [the] injection)
        return arabicSegments.map(segment => ({
          text: segment.text,
          color: segment.color,
          key: `${segment.type}-${segment.text}`,
        }));
      } else {
        // For English text, use generateColorCodedSegments (includes [the] if appropriate)
        return generateColorCodedSegments({
          text,
          formattedAnalysis,
          analysis,
          colors,
          defaultColor: defaultColor || colors.text,
        });
      }
    }, [isArabic, arabicSegments, text, formattedAnalysis, analysis, colors, defaultColor]);

    // If no components detected, render plain text
    if (!hasComponents || coloredSegments.length === 0) {
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
            style={[style, { color: segment.color }]}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  },
);

ColorCodedText.displayName = 'ColorCodedText';
