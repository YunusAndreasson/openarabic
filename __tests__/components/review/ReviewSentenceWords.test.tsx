import { expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { Canvas, Group, Paragraph, type SkParagraph } from 'react-native-skia';

import { ReviewSentenceWords } from '@/components/review/ReviewSentenceWords';
import { ARABIC_FONT_SIZE, getCompactArabicFontSize } from '@/constants/layout';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { loadFirstPage } from '@/services/firstPage';
import * as paragraphs from '@/utils/skiaParagraphBuilder';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);
jest.mock('@/hooks/theme/useDebouncedArabicFontSize', () => ({
  useDebouncedArabicFontSize: jest.fn(),
}));
jest.mock('@/hooks/theme/useSkiaGpuAvailable', () => ({ useSkiaGpuAvailable: () => true }));
jest.mock('@/hooks/theme/useSkiaFonts', () => ({
  useSkiaFonts: () => ({ fontFamily: 'Amiri', fontManager: {} }),
}));

test.each([
  [ARABIC_FONT_SIZE.MIN, 1, 329],
  [ARABIC_FONT_SIZE.MAX, 2, 148],
  [ARABIC_FONT_SIZE.MAX, 3, 80],
])(
  'fits the complete ink of each word at reading size %i, font scale %i and card width %i',
  (size, fontScale, width) => {
    jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 410, height: 850, scale: 2.625, fontScale });
    jest.mocked(useDebouncedArabicFontSize).mockReturnValue(size);
    const sentence = loadFirstPage()
      .sentences[0]!.words.map(w => w.form)
      .join(' ');
    const words = sentence.split(' ');
    const pointSize = Math.round(getCompactArabicFontSize(size) * fontScale);
    // A calligraphic face whose first and last marks extend past the glyph advances.
    // Keep Skia's real canvas measurement, scaling and RN layout styles under test.
    const leftInk = 5;
    const rightInk = 7;
    const advance = (word: string) => (word.length * pointSize) / 2;
    jest.spyOn(paragraphs, 'buildWordParagraph').mockImplementation(({ word, fontSize }) => {
      expect(fontSize).toBe(pointSize);
      const glyphWidth = advance(word.word_form);
      return {
        getMaxIntrinsicWidth: () => glyphWidth,
        getHeight: () => fontSize * 2,
        getPath: () => ({
          computeTightBounds: () => ({
            x: paragraphs.PARAGRAPH_LAYOUT_WIDTH - glyphWidth - leftInk,
            width: glyphWidth + leftInk + rightInk,
          }),
        }),
      } as unknown as SkParagraph;
    });
    jest.mocked(Canvas).mockImplementation(({ children, style }) => (
      <RN.View testID="sentence-canvas" style={style}>
        {children}
      </RN.View>
    ));
    jest.mocked(Group).mockImplementation(({ children }) => <>{children}</>);
    const view = render(<ReviewSentenceWords sentence={sentence} />);
    const row = view.getByLabelText(sentence);
    fireEvent(row, 'layout', { nativeEvent: { layout: { width } } });
    expect(view.getAllByTestId('sentence-canvas', { includeHiddenElements: true })).toHaveLength(1);
    const scales = jest.mocked(Group).mock.calls.flatMap(([props]) => {
      const transform = props.transform;
      return Array.isArray(transform) ? transform.filter(item => 'scale' in item) : [];
    });
    expect(jest.mocked(Paragraph)).toHaveBeenCalledTimes(words.length);
    for (const [index, word] of words.entries()) {
      const inkWidth = Math.ceil(advance(word)) + leftInk + rightInk;
      expect(scales[index]).toEqual({ scale: Math.min(1, width / inkWidth) });
    }
  },
);
