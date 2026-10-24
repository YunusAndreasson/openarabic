import {
  Skia,
  type SkParagraph,
  type SkTypefaceFontProvider,
  TextAlign,
  TextDirection,
} from 'react-native-skia';

import type { SkiaFontFamily } from '@/constants/fonts';
import type { ColoredSegment, SentenceWord } from '@/types/vocabulary.types';

/** Strut height multiplier for consistent Arabic diacritics spacing */
const STRUT_HEIGHT_MULTIPLIER = 1.8;

/** Layout width for single words — wide enough that nothing ever wraps. */
export const PARAGRAPH_LAYOUT_WIDTH = 2000;

/** Subtle letter spacing for improved Arabic readability (0.15px) */
const ARABIC_LETTER_SPACING = 0.15;

const makeParagraphStyle = (
  fontFamily: SkiaFontFamily,
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
  fontFamily: SkiaFontFamily;
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
 * Returns null when there is nothing to measure — no path, or a line with no
 * geometry — or the measurement throws, so callers can fall back to an
 * estimate.
 *
 * @param paragraph A paragraph already laid out at `layoutWidth`
 * @param layoutWidth The width passed to `paragraph.layout()`
 */
const measureInkOverhang = (paragraph: SkParagraph, layoutWidth: number): InkOverhang | null => {
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

/**
 * Vertical paint reserve around the line box, in em (fraction of font size).
 *
 * `forceStrutHeight` pins the line box to `STRUT_HEIGHT_MULTIPLIER` em whatever
 * face is selected, but a face's glyphs do not agree to live inside it. Measured
 * against real corpus articles (`paragraph.getPath(0).computeTightBounds()` vs
 * `getHeight()`), the ink runs past the *bottom* of that box in four of the five
 * bundled faces — up to 0.30em for Scheherazade — while none of them reach its
 * top. Reserving space above and below lets the glyphs paint in full.
 *
 * Per family and in em, for two reasons. In em because the old reserve was a
 * flat 8px above and 6px below: ample at the 13px floor and not nearly enough at
 * the 44px ceiling, so turning the reading size up quietly sliced the tails off
 * ن ج ي. Per family because a single reserve big enough for Scheherazade would
 * spend ~13px of dead leading a line on Noto Sans, which is the default face and
 * needs almost none.
 *
 * Deliberately NOT a per-word measurement, unlike the horizontal ink bleed: the
 * words of a sentence are laid out in a centred row, so a per-word height would
 * shift each word's baseline by half its own overhang. These are constant for a
 * given (family, size), which keeps every baseline in a line identical.
 *
 * Values are the measured maxima plus roughly 0.09em of headroom for glyph
 * combinations the corpus sample did not contain.
 *
 * Keyed by `SkiaFontFamily`, so the table is total over the faces the app ships
 * and there is no default row to fall through to. As an open `Record<string,
 * …>` a family name that drifted out of step with `SKIA_FONT_FAMILY_MAP` landed
 * on a flat 0.4em bottom reserve — the Scheherazade figure — which on the
 * default face is ~13px of dead leading per line, silently, with the layout
 * still looking plausible.
 */
const VERTICAL_INK_EM: Record<SkiaFontFamily, { top: number; bottom: number }> = {
  'Noto Sans Arabic': { top: 0.2, bottom: 0.12 },
  'Digital Khatt New Madina': { top: 0.2, bottom: 0.3 },
  Amiri: { top: 0.2, bottom: 0.36 },
  'Scheherazade New': { top: 0.2, bottom: 0.4 },
  'Noto Nastaliq Urdu': { top: 0.2, bottom: 0.32 },
};

/**
 * Fallback horizontal ink bleed per font family, in em (fraction of font size).
 * Calligraphic fonts paint well beyond their glyph advances; without this
 * reserve the canvas clips edge glyphs and the paragraph can force-break
 * the word onto a hidden second line.
 *
 * Only used when the real bleed cannot be measured — see `measureInkOverhang`,
 * whose measurement supersedes these estimates whenever it returns one.
 */
const INK_BLEED_EM: Record<SkiaFontFamily, number> = {
  'Noto Sans Arabic': 0.08,
  'Digital Khatt New Madina': 0.3,
  Amiri: 0.3,
  'Scheherazade New': 0.3,
  'Noto Nastaliq Urdu': 0.35,
};

/** Canvas geometry for painting a laid-out single-line Arabic paragraph. */
export interface ParagraphCanvasMetrics {
  /** Canvas width: the layout box plus the right-hand paint-only reserve. */
  width: number;
  /** Canvas height: paragraph height plus the vertical reserves and `bottomGap`. */
  height: number;
  /** Width to lay the paragraph out at inside the canvas. */
  layoutWidth: number;
  /** Paint-only reserve left of the glyph advance. */
  inkLeft: number;
  /** Paint-only reserve right of the glyph advance. */
  inkRight: number;
  /** y to paint the paragraph at: the diacritic headroom above the line box. */
  paintY: number;
  /** Paint-only reserve below the line box, where the descenders run. */
  inkBottom: number;
}

/**
 * Sizes a canvas so a laid-out Arabic paragraph paints in full.
 *
 * Arabic needs room on three sides that the text advance box does not describe:
 * diacritics stack above it, calligraphic faces bleed past it horizontally, and
 * callers that draw beneath the glyphs need a reserved strip. Everything here is
 * paint-only — it never changes where the baseline sits.
 */
export const measureParagraphCanvas = (
  paragraph: SkParagraph | null,
  {
    fontSize,
    fontFamily,
    bottomGap = 0,
  }: { fontSize: number; fontFamily: SkiaFontFamily; bottomGap?: number },
): ParagraphCanvasMetrics => {
  const vertical = VERTICAL_INK_EM[fontFamily];
  const paintY = Math.ceil(fontSize * vertical.top);
  const inkBottom = Math.ceil(fontSize * vertical.bottom);

  // Nothing shaped yet (the font manager loads once per session). Reserve the
  // line the word is about to occupy rather than a flat 60x40, which held the
  // right height for roughly an 18px reading size and nothing else: at the 44px
  // ceiling every word was a third of its eventual height for a frame, so the
  // sentence wrapped differently and then jumped.
  if (!paragraph) {
    const height = Math.ceil(fontSize * STRUT_HEIGHT_MULTIPLIER) + paintY + inkBottom + bottomGap;
    const width = Math.ceil(fontSize * 3);
    return { width, height, layoutWidth: width, inkLeft: 0, inkRight: 0, paintY, inkBottom };
  }

  // Real painted extent where the native module can report it, per-family
  // estimate everywhere else.
  const overhang = measureInkOverhang(paragraph, PARAGRAPH_LAYOUT_WIDTH);
  const estimate = Math.ceil(fontSize * INK_BLEED_EM[fontFamily]);
  const inkLeft = overhang ? Math.ceil(overhang.left) : estimate;
  const inkRight = overhang ? Math.ceil(overhang.right) : estimate;

  // Right-aligned RTL text hugs the layout right edge, so the left reserve
  // has to widen the layout box itself while the right reserve only widens
  // the canvas around it.
  const layoutWidth = Math.ceil(paragraph.getMaxIntrinsicWidth()) + inkLeft;

  return {
    width: layoutWidth + inkRight,
    height: Math.ceil(paragraph.getHeight()) + paintY + inkBottom + bottomGap,
    layoutWidth,
    inkLeft,
    inkRight,
    paintY,
    inkBottom,
  };
};

/** Builds a Skia paragraph from colored text segments with consistent diacritics spacing. */
const buildColoredParagraph = (config: ParagraphConfig): SkParagraph | null => {
  if (config.segments.length === 0) {
    return null;
  }
  return buildParagraphFromSegments(config.segments, config);
};

/** Builds a single-color paragraph for words without colored segments. */
const buildSimpleParagraph = (config: SimpleParagraphConfig): SkParagraph | null => {
  if (!config.text) {
    return null;
  }
  return buildParagraphFromSegments([{ text: config.text, color: config.color }], config);
};

/** The two theme colours a word is painted in when it carries no grammar colour. */
interface WordParagraphColors {
  text: string;
  arabicText: string;
}

/**
 * Whether any segment carries a grammar colour, rather than one of the plain
 * text colours.
 *
 * A segment set painted only in `text`/`arabicText` is the same picture as
 * plain text, so every caller draws the cheaper single run for it. The one
 * definition for the reader's words, `SkiaColoredArabic` and `ColorCodedText`,
 * which each used to spell the comparison out.
 */
export const hasGrammarColour = (
  segments: readonly Pick<ColoredSegment, 'color'>[],
  colors: WordParagraphColors,
): boolean => segments.some(seg => seg.color !== colors.text && seg.color !== colors.arabicText);

interface WordParagraphConfig {
  word: Pick<SentenceWord, 'word_form' | 'coloredSegments'>;
  colors: WordParagraphColors;
  /** The single run's colour when the word carries no grammar colour. Defaults to `arabicText`. */
  plainColor?: string;
  fontSize: number;
  fontFamily: SkiaFontFamily;
  fontManager?: SkTypefaceFontProvider | null;
}

/**
 * The paragraph for one Arabic word or phrase: grammar-coloured when its
 * segments carry a colour, a single run in `plainColor` otherwise.
 *
 * Selection is never carried by the glyph colour: repainting a saved word in
 * the brand tint both shouted and overwrote the grammar colours it covered. The
 * marker rule under the word is the only channel that says "saved".
 *
 * Null until the shared font manager has loaded: native `ParagraphBuilder.Make`
 * throws without a font provider, so words fill in a frame later.
 */
export const buildWordParagraph = ({
  word,
  colors,
  plainColor = colors.arabicText,
  fontSize,
  fontFamily,
  fontManager,
}: WordParagraphConfig): SkParagraph | null => {
  if (!fontManager) {
    return null;
  }

  const segments = word.coloredSegments ?? [];

  if (hasGrammarColour(segments, colors)) {
    return buildColoredParagraph({
      segments,
      fontSize,
      fontFamily,
      fontManager,
      textDirection: TextDirection.RTL,
      maxWidth: PARAGRAPH_LAYOUT_WIDTH,
      letterSpacing: 0,
    });
  }

  return buildSimpleParagraph({
    text: word.word_form,
    fontSize,
    color: plainColor,
    fontFamily,
    fontManager,
    textDirection: TextDirection.RTL,
    maxWidth: PARAGRAPH_LAYOUT_WIDTH,
  });
};
