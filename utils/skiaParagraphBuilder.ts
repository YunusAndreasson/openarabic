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
    maxWidth = 2000,
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
