import {
  Skia,
  type SkFont,
  type SkParagraph,
  type SkTypefaceFontProvider,
  TextAlign,
  TextDirection,
} from '@shopify/react-native-skia';

import type { ColoredSegment } from '@/types/vocabulary.types';

/** Strut height multiplier for consistent Arabic diacritics spacing */
const STRUT_HEIGHT_MULTIPLIER = 1.8;

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

export interface ParagraphConfig {
  segments: ColoredSegment[];
  font: SkFont;
  fontFamily: string;
  fontManager?: SkTypefaceFontProvider | null;
  textDirection?: TextDirection;
  maxWidth?: number;
  letterSpacing?: number;
}

/** Builds a Skia paragraph from colored text segments with consistent diacritics spacing. */
export const buildColoredParagraph = (config: ParagraphConfig): SkParagraph | null => {
  const {
    segments,
    font,
    fontFamily,
    fontManager,
    textDirection = TextDirection.RTL,
    maxWidth = 2000,
    letterSpacing = 0,
  } = config;

  if (segments.length === 0) {
    return null;
  }

  try {
    const fontSize = font.getSize();
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
  } catch {
    return null;
  }
};

/** Builds a single-color paragraph for words without colored segments. */
export const buildSimpleParagraph = (
  text: string,
  font: SkFont,
  color: string,
  fontFamily: string,
  textDirection: TextDirection = TextDirection.RTL,
  maxWidth: number = 2000,
  fontManager?: SkTypefaceFontProvider | null,
): SkParagraph | null => {
  if (!text) {
    return null;
  }

  try {
    const fontSize = font.getSize();
    const builder = Skia.ParagraphBuilder.Make(
      makeParagraphStyle(fontFamily, fontSize, textDirection),
      fontManager ?? undefined,
    );

    builder.pushStyle({
      color: Skia.Color(color),
      fontFamilies: [fontFamily],
      fontSize,
    });
    builder.addText(text);
    builder.pop();

    const paragraph = builder.build();
    paragraph.layout(maxWidth);

    return paragraph;
  } catch {
    return null;
  }
};
