import type { SkParagraph } from 'react-native-skia';

import type { SkiaFontFamily } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';
import { measureParagraphCanvas, type ParagraphCanvasMetrics } from '@/utils/skiaParagraphBuilder';

/**
 * Clear space between the deepest descender and the marker rule.
 *
 * Sits below the descender reserve `measureParagraphCanvas` returns, so the rule
 * clears the real ink rather than the line box — which is why it used to cross
 * the tails on every face but Noto Sans.
 *
 * Arabic descends a long way below the baseline (ن, ج, ي), and a rule drawn
 * flush against that tail crowds the harf and hurts legibility.
 */
export const MARKER_UNDERLINE_GAP = 6;

/** Horizontal padding of a word's box, either side of its glyphs. */
export const WORD_PADDING = LAYOUT.SPACING.MICRO;

/** Gap between words on a line, and between lines. */
export const SENTENCE_WORD_GAP = LAYOUT.SPACING.HALF_TINY;

/**
 * One reader word's box: the paragraph's paint area plus the padding and
 * signed margins it lays out with.
 */
export interface SentenceWordMetrics extends ParagraphCanvasMetrics {
  /** Width of the word's own box: the paint area plus `WORD_PADDING` each side. */
  boxWidth: number;
  /** Signed: the paint-only ink reserve is cancelled, a constant gap handed back. */
  marginLeft: number;
  marginRight: number;
  /** What the word takes up on its line: the box plus both margins. */
  outerWidth: number;
}

/**
 * Sizes one reader word, exactly as its own canvas used to be sized.
 *
 * `MARKER_UNDERLINE_GAP` is reserved under the glyphs for the marker rule.
 * The ink reserve is paint-only, so all of it is cancelled in layout and a
 * constant `visualPad` gap handed back: a heavily bleeding Amiri glyph and a
 * flush Noto one both take up advance + 2 × visualPad. The margins stay signed,
 * because a face that bleeds less than `visualPad` needs a positive one.
 */
export const measureSentenceWord = (
  paragraph: SkParagraph | null,
  fontSize: number,
  fontFamily: SkiaFontFamily,
): SentenceWordMetrics => {
  const canvas = measureParagraphCanvas(paragraph, {
    fontSize,
    fontFamily,
    bottomGap: MARKER_UNDERLINE_GAP,
  });
  // Visual breathing room between words, at the pre-bleed rhythm (~5% of the
  // word width was baked into the original canvas sizing).
  const visualPad = Math.ceil(fontSize * 0.05);
  const marginLeft = visualPad - canvas.inkLeft;
  const marginRight = visualPad - canvas.inkRight;
  const boxWidth = canvas.width + 2 * WORD_PADDING;

  return {
    ...canvas,
    boxWidth,
    marginLeft,
    marginRight,
    outerWidth: marginLeft + boxWidth + marginRight,
  };
};

/** Where a word's box sits in its sentence block, in points from the top-left. */
export interface PlacedWord {
  /** Left edge of the word's box (its margins excluded). */
  x: number;
  /** Top edge of the word's box. */
  y: number;
}

export interface SentenceLayout {
  words: PlacedWord[];
  /** Height of the block that holds every line. */
  height: number;
}

/**
 * Places a sentence's words the way a `row-reverse` + `wrap` flex row with a
 * uniform `gap` and `alignItems: 'center'` placed their separate canvases.
 *
 * The first word sits against the right edge and each next one to its left. A
 * word wraps to a new line when it would cross the left edge, unless it is the
 * first on its line: a word wider than the line keeps a line of its own and
 * overflows to the left, as Yoga lets it. Words are centred vertically on their
 * line.
 */
export const layoutSentenceWords = (
  words: readonly Pick<SentenceWordMetrics, 'outerWidth' | 'height' | 'marginLeft'>[],
  availableWidth: number,
  gap: number = SENTENCE_WORD_GAP,
): SentenceLayout => {
  const lines: number[][] = [];
  let line: number[] = [];
  let lineWidth = 0;

  words.forEach((word, index) => {
    const needed = line.length === 0 ? word.outerWidth : lineWidth + gap + word.outerWidth;
    if (line.length > 0 && needed > availableWidth) {
      lines.push(line);
      line = [index];
      lineWidth = word.outerWidth;
      return;
    }
    line.push(index);
    lineWidth = needed;
  });
  if (line.length > 0) {
    lines.push(line);
  }

  const placed: PlacedWord[] = words.map(() => ({ x: 0, y: 0 }));
  let top = 0;

  lines.forEach((indices, lineIndex) => {
    const lineHeight = Math.max(...indices.map(index => words[index]?.height ?? 0));
    let right = availableWidth;
    for (const index of indices) {
      const word = words[index];
      if (!word) continue;
      const outerLeft = right - word.outerWidth;
      placed[index] = {
        x: outerLeft + word.marginLeft,
        y: top + (lineHeight - word.height) / 2,
      };
      right = outerLeft - gap;
    }
    top += lineHeight + (lineIndex < lines.length - 1 ? gap : 0);
  });

  return { words: placed, height: top };
};
