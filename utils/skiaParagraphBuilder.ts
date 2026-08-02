import {
  Skia,
  type SkParagraph,
  type SkTypefaceFontProvider,
  TextAlign,
  TextDirection,
} from '@shopify/react-native-skia';

import type { ColoredSegment } from '@/types/vocabulary.types';

/** Strut height multiplier for consistent Arabic diacritics spacing */
const STRUT_HEIGHT_MULTIPLIER = 1.8;

/** Layout width for single words — wide enough that nothing ever wraps. */
export const PARAGRAPH_LAYOUT_WIDTH = 2000;

/** Subtle letter spacing for improved Arabic readability (0.15px) */
const ARABIC_LETTER_SPACING = 0.15;

const makeParagraphStyle = (
  fontFamily: string,
  fontSize: number,
  textDirection: TextDirection,
) => ({
  textAlign: textDirection === TextDirection.RTL ? TextAlign.Right : TextAlign.Left,
  textDirection,
  strutStyle: {
    strutEnabled: true,
    fontFamilies: [fontFamily],
    fontSize,
    heightMultiplier: STRUT_HEIGHT_MULTIPLIER,
    forceStrutHeight: true,
  },
});

interface ParagraphBaseConfig {
  fontSize: number;
  fontFamily: string;
  fontManager?: SkTypefaceFontProvider | null;
  textDirection?: TextDirection;
  maxWidth?: number;
  letterSpacing?: number;
}

export interface ParagraphConfig extends ParagraphBaseConfig {
  segments: ColoredSegment[];
}

export interface SimpleParagraphConfig extends ParagraphBaseConfig {
  text: string;
  color: string;
}

const buildParagraphFromSegments = (
  segments: Pick<ColoredSegment, 'text' | 'color'>[],
  {
    fontSize,
    fontFamily,
    fontManager,
    textDirection = TextDirection.RTL,
    maxWidth = PARAGRAPH_LAYOUT_WIDTH,
    letterSpacing = ARABIC_LETTER_SPACING,
  }: ParagraphBaseConfig,
): SkParagraph | null => {
  try {
    const builder = Skia.ParagraphBuilder.Make(
      makeParagraphStyle(fontFamily, fontSize, textDirection),
      fontManager ?? undefined,
    );

    for (const segment of segments) {
      builder.pushStyle({
        color: Skia.Color(segment.color),
        fontFamilies: [fontFamily],
        fontSize,
        letterSpacing,
      });
      builder.addText(segment.text);
      builder.pop();
    }

    const paragraph = builder.build();
    paragraph.layout(maxWidth);

    return paragraph;
  } catch (error) {
    // A null paragraph renders as an invisible word — surface the cause in dev
    if (__DEV__) {
      console.warn('[skiaParagraphBuilder] Failed to build paragraph', error);
    }
    return null;
  }
};

/** How far a word's glyphs paint outside its text advance box, in px. */
export interface InkOverhang {
  /** Ink extending left of the advance box (0 when the glyphs stay inside). */
  left: number;
  /** Ink extending right of the advance box (0 when the glyphs stay inside). */
  right: number;
}

/**
 * Measures the exact horizontal ink bleed of a laid-out single-line paragraph.
 *
 * Calligraphic Arabic faces paint well beyond their glyph advances, so a canvas
 * sized to the advance alone clips the edge glyphs. `getPath` renders the line
 * (font fallbacks already applied) and `computeTightBounds` gives its true
 * painted extent — as opposed to the font-metrics box `getRectsForRange`
 * reports.
 *
 * Returns null when the running native module predates the API (added in Skia
 * 2.8.0) so callers can fall back to an estimate.
 *
 * @param paragraph A paragraph already laid out at `layoutWidth`
 * @param layoutWidth The width passed to `paragraph.layout()`
 */
export const measureInkOverhang = (
  paragraph: SkParagraph,
  layoutWidth: number,
): InkOverhang | null => {
  if (typeof paragraph.getPath !== 'function') {
    return null;
  }

  try {
    const path = paragraph.getPath(0);
    if (!path) {
      return null;
    }

    const ink = path.computeTightBounds();
    // A whitespace-only or colour-glyph-only line yields no path geometry.
    if (ink.width <= 0) {
      return null;
    }

    // RTL paragraphs are TextAlign.Right, so the advance box always ends flush
    // with the layout width: [layoutWidth - advance, layoutWidth]. Both reserves
    // clamp at 0 because ink narrower than the advance (side bearings) needs no
    // extra room.
    const advance = paragraph.getMaxIntrinsicWidth();
    return {
      left: Math.max(0, layoutWidth - advance - ink.x),
      right: Math.max(0, ink.x + ink.width - layoutWidth),
    };
  } catch {
    return null;
  }
};

/** Builds a Skia paragraph from colored text segments with consistent diacritics spacing. */
export const buildColoredParagraph = (config: ParagraphConfig): SkParagraph | null => {
  if (config.segments.length === 0) {
    return null;
  }
  return buildParagraphFromSegments(config.segments, config);
};

/** Builds a single-color paragraph for words without colored segments. */
export const buildSimpleParagraph = (config: SimpleParagraphConfig): SkParagraph | null => {
  if (!config.text) {
    return null;
  }
  return buildParagraphFromSegments([{ text: config.text, color: config.color }], config);
};
