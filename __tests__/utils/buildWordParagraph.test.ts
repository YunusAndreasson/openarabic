import { Skia } from 'react-native-skia';

import type { SentenceWord } from '@/types/vocabulary.types';
import { buildWordParagraph } from '@/utils/skiaParagraphBuilder';

const COLORS = { text: '#eeeeee', arabicText: '#1a1a1a' };
const FONTS = {
  fontSize: 17,
  fontFamily: 'Noto Sans Arabic' as const,
  fontManager: {} as never,
};

/** Records the colour and text of every run the paragraph is built from. */
const recordRuns = () => {
  const runs: { color: unknown; text: string }[] = [];
  let color: unknown;
  jest.spyOn(Skia.ParagraphBuilder, 'Make').mockImplementation(
    () =>
      ({
        pushStyle: (style: { color: unknown }) => {
          color = style.color;
        },
        addText: (text: string) => {
          runs.push({ color, text });
        },
        pop: () => {},
        build: () => ({ layout: () => {} }),
      }) as never,
  );
  return runs;
};

const word = (overrides: Partial<SentenceWord>) =>
  ({ word_form: 'كِتَاب', coloredSegments: [], ...overrides }) as SentenceWord;

describe('buildWordParagraph', () => {
  test('waits for the font manager: native ParagraphBuilder.Make throws without one', () => {
    const runs = recordRuns();

    expect(
      buildWordParagraph({ word: word({}), colors: COLORS, ...FONTS, fontManager: null }),
    ).toBeNull();
    expect(runs).toEqual([]);
  });

  test('paints a word with no segments as one run in arabicText', () => {
    const runs = recordRuns();

    buildWordParagraph({ word: word({}), colors: COLORS, ...FONTS });

    expect(runs).toEqual([{ color: '#1a1a1a', text: 'كِتَاب' }]);
  });

  test('keeps a single coloured segment coloured when it is the whole word', () => {
    // The bug report: a compound prefix that is the entire word (فَإِذَا) came
    // out uncoloured because one segment was taken to mean "no components".
    const runs = recordRuns();

    buildWordParagraph({
      word: word({
        word_form: 'فَإِذَا',
        coloredSegments: [{ text: 'فَإِذَا', color: '#8fb397', type: 'prefix' }],
      }),
      colors: COLORS,
      ...FONTS,
    });

    expect(runs).toEqual([{ color: '#8fb397', text: 'فَإِذَا' }]);
  });

  test('paints each grammar segment in its own colour', () => {
    const runs = recordRuns();

    buildWordParagraph({
      word: word({
        word_form: 'وَالْكِتَابُ',
        coloredSegments: [
          { text: 'وَ', color: '#7c3aed', type: 'prefix' },
          { text: 'الْ', color: '#2563eb', type: 'prefix' },
          { text: 'كِتَابُ', color: '#1a1a1a', type: 'root' },
        ],
      }),
      colors: COLORS,
      ...FONTS,
    });

    expect(runs).toEqual([
      { color: '#7c3aed', text: 'وَ' },
      { color: '#2563eb', text: 'الْ' },
      { color: '#1a1a1a', text: 'كِتَابُ' },
    ]);
  });

  test('builds the plain run when the segments carry only the text colours', () => {
    const runs = recordRuns();

    buildWordParagraph({
      word: word({
        word_form: 'كِتَاب',
        coloredSegments: [
          { text: 'كِ', color: '#eeeeee', type: 'root' },
          { text: 'تَاب', color: '#1a1a1a', type: 'root' },
        ],
      }),
      colors: COLORS,
      ...FONTS,
    });

    expect(runs).toEqual([{ color: '#1a1a1a', text: 'كِتَاب' }]);
  });

  test('an empty word builds no paragraph rather than an invisible one', () => {
    recordRuns();

    expect(
      buildWordParagraph({ word: word({ word_form: '' }), colors: COLORS, ...FONTS }),
    ).toBeNull();
  });
});
