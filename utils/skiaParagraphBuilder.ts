import {
  Skia,
  type SkFont,
  type SkParagraph,
  TextAlign,
  TextDirection,
} from '@shopify/react-native-skia';

import type { ColoredSegment } from '@/types/vocabulary.types';

/**
 * Configuration for building a Skia paragraph from colored segments
 */
export interface ParagraphConfig {
  /** Colored text segments to render */
  segments: ColoredSegment[];
  /** Base font for rendering */
  font: SkFont;
  /** Font family name for text rendering */
  fontFamily: string;
  /** Text direction (ltr or rtl) */
  textDirection?: TextDirection;
  /** Maximum width for layout */
  maxWidth?: number;
  /** Letter spacing (default: 0) */
  letterSpacing?: number;
}

/**
 * Builds a Skia paragraph from colored text segments
 * Optimized for Arabic text with RTL support and multi-color rendering
 *
 * @param config - Configuration object with segments, font, and styling options
 * @returns A laid-out Skia paragraph ready for rendering, or null if build fails
 *
 * @example
 * const paragraph = buildColoredParagraph({
 *   segments: word.coloredSegments || [],
 *   font: arabicFont,
 *   textDirection: 'rtl',
 *   maxWidth: 300,
 * });
 *
 * if (paragraph) {
 *   return (
 *     <Canvas style={{ width: 300, height: paragraph.getHeight() }}>
 *       <Paragraph paragraph={paragraph} x={0} y={0} />
 *     </Canvas>
 *   );
 * }
 */
export const buildColoredParagraph = (config: ParagraphConfig): SkParagraph | null => {
  const {
    segments,
    font,
    fontFamily,
    textDirection = TextDirection.RTL,
    maxWidth = 2000,
    letterSpacing = 0,
  } = config;

  if (segments.length === 0) {
    return null;
  }

  try {
    // Create paragraph style for RTL text
    const paragraphStyle = {
      textAlign: textDirection === TextDirection.RTL ? TextAlign.Right : TextAlign.Left,
      textDirection,
    };

    // Build paragraph with colored segments
    const builder = Skia.ParagraphBuilder.Make(paragraphStyle);

    // Add each segment with its color
    for (const segment of segments) {
      // Push text style for this segment
      builder.pushStyle({
        color: Skia.Color(segment.color),
        fontFamilies: [fontFamily],
        fontSize: font.getSize(),
        letterSpacing,
      });

      // Add the text
      builder.addText(segment.text);

      // Pop the style
      builder.pop();
    }

    // Build the paragraph
    const paragraph = builder.build();

    // Layout with large width to prevent any wrapping for single words
    // This ensures diacritics never wrap to next line
    paragraph.layout(maxWidth);

    return paragraph;
  } catch {
    return null;
  }
};

/**
 * Builds a simple single-color paragraph for Arabic text
 * Used for words without colored segments (fallback case)
 *
 * @param text - The text to render
 * @param font - The Skia font to use
 * @param color - The text color
 * @param fontFamily - Font family name
 * @param textDirection - Text direction (default: rtl)
 * @param maxWidth - Maximum width for layout (default: 2000)
 * @returns A laid-out Skia paragraph, or null if build fails
 */
export const buildSimpleParagraph = (
  text: string,
  font: SkFont,
  color: string,
  fontFamily: string,
  textDirection: TextDirection = TextDirection.RTL,
  maxWidth: number = 2000,
): SkParagraph | null => {
  if (!text) {
    return null;
  }

  try {
    const paragraphStyle = {
      textAlign: textDirection === TextDirection.RTL ? TextAlign.Right : TextAlign.Left,
      textDirection,
    };

    const builder = Skia.ParagraphBuilder.Make(paragraphStyle);

    builder.pushStyle({
      color: Skia.Color(color),
      fontFamilies: [fontFamily],
      fontSize: font.getSize(),
    });

    builder.addText(text);
    builder.pop();

    const paragraph = builder.build();
    // Layout with large width to prevent any wrapping for single words
    paragraph.layout(maxWidth);

    return paragraph;
  } catch {
    // Failed to build paragraph - return null for graceful degradation
    return null;
  }
};
