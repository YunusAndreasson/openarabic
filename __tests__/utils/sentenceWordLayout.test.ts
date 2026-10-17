import type { SkParagraph } from 'react-native-skia';

import { LAYOUT } from '@/constants/layout';
import {
  layoutSentenceWords,
  MARKER_UNDERLINE_GAP,
  measureSentenceWord,
  SENTENCE_WORD_GAP,
} from '@/utils/sentenceWordLayout';
import { PARAGRAPH_LAYOUT_WIDTH } from '@/utils/skiaParagraphBuilder';

/** A word box as the layout sees it: outer width, height, and its left margin. */
const box = (outerWidth: number, height = 40, marginLeft = 0) => ({
  outerWidth,
  height,
  marginLeft,
});

describe('layoutSentenceWords', () => {
  test('starts at the right edge and runs leftward, as the row-reverse row did', () => {
    const { words, height } = layoutSentenceWords([box(100), box(60)], 300, 2);

    expect(words[0]).toEqual({ x: 200, y: 0 });
    // The second word ends one gap to the left of where the first begins.
    expect(words[1]).toEqual({ x: 200 - 2 - 60, y: 0 });
    expect(height).toBe(40);
  });

  test('wraps a word that would cross the left edge onto the next line', () => {
    const { words, height } = layoutSentenceWords([box(150), box(140), box(20)], 300, 2);

    // 150 + 2 + 140 = 292 fits; adding 2 + 20 does not.
    expect(words[1]?.y).toBe(0);
    expect(words[2]).toEqual({ x: 280, y: 42 });
    expect(height).toBe(40 + 2 + 40);
  });

  test('fills a line exactly to its width without wrapping', () => {
    const { words } = layoutSentenceWords([box(149), box(149)], 300, 2);

    expect(words[1]).toEqual({ x: 0, y: 0 });
  });

  test('gives a word wider than the line a line of its own, overflowing left', () => {
    const { words, height } = layoutSentenceWords([box(50), box(400), box(50)], 300, 2);

    expect(words[0]).toEqual({ x: 250, y: 0 });
    expect(words[1]).toEqual({ x: -100, y: 42 });
    expect(words[2]).toEqual({ x: 250, y: 84 });
    expect(height).toBe(40 * 3 + 2 * 2);
  });

  test('centres a shorter word on its line', () => {
    const { words, height } = layoutSentenceWords([box(50, 40), box(50, 30)], 300, 2);

    expect(words[1]?.y).toBe(5);
    expect(height).toBe(40);
  });

  test('places the box inside its signed margins', () => {
    // A negative left margin is ink reserve cancelled in layout: the box starts
    // to the left of the slot the word takes up on the line.
    const { words } = layoutSentenceWords([box(100, 40, -4)], 300, 2);

    expect(words[0]?.x).toBe(196);
  });

  test('an empty sentence takes no height', () => {
    expect(layoutSentenceWords([], 300)).toEqual({ words: [], height: 0 });
  });

  test('uses the gap the flex row used by default', () => {
    expect(SENTENCE_WORD_GAP).toBe(LAYOUT.SPACING.HALF_TINY);
  });
});

describe('measureSentenceWord', () => {
  /** A laid-out paragraph whose ink bleeds 5px past its 40px advance on both sides. */
  const bleedingParagraph = {
    getMaxIntrinsicWidth: () => 40,
    getHeight: () => 30,
    getPath: () => ({
      computeTightBounds: () => ({
        x: PARAGRAPH_LAYOUT_WIDTH - 40 - 5,
        y: 0,
        width: 50,
        height: 30,
      }),
    }),
  } as unknown as SkParagraph;

  test('cancels the ink reserve in layout, so a word takes up its advance plus a fixed gap', () => {
    const metrics = measureSentenceWord(bleedingParagraph, 17, 'Amiri');
    const visualPad = Math.ceil(17 * 0.05);

    expect(metrics.inkLeft).toBe(5);
    expect(metrics.inkRight).toBe(5);
    // The paint area holds the bleed, and the box adds a micro padding each side...
    expect(metrics.boxWidth).toBe(40 + 5 + 5 + 2 * LAYOUT.SPACING.MICRO);
    // ...but the margins hand all of the bleed back, signed.
    expect(metrics.marginLeft).toBe(visualPad - 5);
    expect(metrics.marginRight).toBe(visualPad - 5);
    expect(metrics.outerWidth).toBe(40 + 2 * visualPad + 2 * LAYOUT.SPACING.MICRO);
  });

  test('keeps a positive margin for a face that bleeds less than the gap', () => {
    const flush = {
      ...bleedingParagraph,
      getPath: () => ({
        computeTightBounds: () => ({ x: PARAGRAPH_LAYOUT_WIDTH - 40, y: 0, width: 40, height: 30 }),
      }),
    } as unknown as SkParagraph;

    const metrics = measureSentenceWord(flush, 40, 'Noto Sans Arabic');

    expect(metrics.marginLeft).toBe(Math.ceil(40 * 0.05));
    expect(metrics.marginRight).toBe(Math.ceil(40 * 0.05));
  });

  test('reserves the marker gap under the glyphs', () => {
    const withGap = measureSentenceWord(bleedingParagraph, 17, 'Amiri');
    const paragraphOnly = 30 + withGap.paintY + withGap.inkBottom;

    expect(withGap.height - paragraphOnly).toBe(MARKER_UNDERLINE_GAP);
  });
});
