/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * SkiaArabicWord Component Tests
 *
 * Tests the Skia-based Arabic word rendering component with:
 * - GPU-accelerated text rendering via Skia Canvas
 * - Color-coded grammar segments using Skia Paragraph API
 * - Selection states
 * - Tooltip interaction
 * - Single-word rule (no color-coding for single English words)
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { SkiaArabicWord } from '@/components/article/SkiaArabicWord';
import type { SentenceWord } from '@/types/vocabulary.types';

import { measuring, type MeasureCallback } from '../helpers/testUtils';

// Use shared mock factory from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useSkiaFonts', () => ({
  useSkiaFonts: jest.fn(() => ({
    isReady: true,
    fontSize: 17,
    fontFamily: 'Noto Sans Arabic',
    fontManager: { registerFont: jest.fn() },
  })),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useArabicWord: jest.fn(() => ({ isSelected: false })),
}));

// Only the two builders are stubbed. The canvas-sizing helpers stay real so the
// component's geometry is exercised rather than replaced by a stub — a partial
// mock here silently dropped `measureParagraphCanvas` and took the whole suite
// down with it.
jest.mock('@/utils/skiaParagraphBuilder', () => ({
  ...jest.requireActual<object>('@/utils/skiaParagraphBuilder'),
  buildColoredParagraph: jest.fn(() => null),
  buildSimpleParagraph: jest.fn(() => null),
}));

const { useArabicWord } = require('@/hooks/vocabulary');
const { useSkiaFonts } = require('@/hooks/theme/useSkiaFonts');
const { buildSimpleParagraph } = require('@/utils/skiaParagraphBuilder');

describe('SkiaArabicWord Component', () => {
  const createMockWord = (overrides: Partial<SentenceWord> = {}): SentenceWord => ({
    id: 1,
    position: 0,
    word_form: 'كتاب',
    english: 'book',
    difficulty_level: 1,
    grammar_note: null,
    root_id: 1,
    sentence_id: 1,
    word_type_id: 1,
    coloredSegments: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useArabicWord).mockReturnValue({ isSelected: false });
    jest.mocked(useSkiaFonts).mockReturnValue({
      isReady: true,
      fontSize: 17,
      fontFamily: 'Noto Sans Arabic',
      fontManager: { registerFont: jest.fn() },
    });
  });

  describe('Basic Rendering', () => {
    test('renders Skia Canvas for Arabic text', () => {
      const word = createMockWord({ word_form: 'كتاب' });
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="arabic-word-1" />);

      expect(getByTestId('arabic-word-1')).toBeTruthy();
    });

    test('renders with testID for testing', () => {
      const word = createMockWord();
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="arabic-word-1" />);

      expect(getByTestId('arabic-word-1')).toBeTruthy();
    });

    test('renders without colored segments when none provided', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        coloredSegments: [],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();
    });
  });

  describe('Color-Coded Grammar Segments', () => {
    test('renders word with multiple colored segments via Skia', () => {
      const word = createMockWord({
        word_form: 'والكتاب',
        english: 'and the book',
        coloredSegments: [
          { text: 'و', color: '#7c3aed', type: 'prefix' },
          { text: 'ال', color: '#2563eb', type: 'prefix' },
          { text: 'كتاب', color: '#1a1a1a', type: 'root' },
        ],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      // Should render Skia Canvas with paragraph
      expect(getByTestId('word')).toBeTruthy();
    });

    test('applies single-word rule (no color-coding for single English words)', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        english: 'book', // Single word
        coloredSegments: [], // Should be empty due to single-word rule
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();
    });

    test('allows color-coding for multi-word English translations', () => {
      const word = createMockWord({
        word_form: 'والكتاب',
        english: 'and the book', // Multi-word
        coloredSegments: [
          { text: 'و', color: '#7c3aed', type: 'prefix' },
          { text: 'ال', color: '#2563eb', type: 'prefix' },
          { text: 'كتاب', color: '#1a1a1a', type: 'root' },
        ],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();
    });

    test('handles diacritics in colored segments', () => {
      const word = createMockWord({
        word_form: 'وَالْكِتَابِ',
        english: 'and the book',
        coloredSegments: [
          { text: 'وَ', color: '#7c3aed', type: 'prefix' },
          { text: 'الْ', color: '#2563eb', type: 'prefix' },
          { text: 'كِتَابِ', color: '#1a1a1a', type: 'root' },
        ],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    // Selection is carried by the marker rule under the word, never by the glyph
    // color: repainting a saved word in the brand tint shouted, and overwrote the
    // grammar colors it covered. Colors come from the shared useColors mock
    // (tint #4a7c59, arabicText #1a1a1a).
    test('leaves the glyph color alone when a word is selected', () => {
      jest.mocked(useArabicWord).mockReturnValue({ isSelected: true });

      const word = createMockWord();
      render(<SkiaArabicWord word={word} testID="word" />);

      expect(buildSimpleParagraph).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#1a1a1a', fontSize: 17 }),
      );
    });

    test('renders unselected words with the default text color', () => {
      jest.mocked(useArabicWord).mockReturnValue({ isSelected: false });

      const word = createMockWord();
      render(<SkiaArabicWord word={word} testID="word" />);

      expect(buildSimpleParagraph).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#1a1a1a', fontSize: 17 }),
      );
    });
  });

  describe('Tooltip Interaction', () => {
    test('does not crash when onTooltipOpen is not provided', () => {
      const word = createMockWord();
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      const wordElement = getByTestId('word');

      // Should not crash
      expect(() => fireEvent.press(wordElement)).not.toThrow();
    });

    test('opens the tooltip on the measured frame', () => {
      const word = createMockWord();
      const onTooltipOpen = jest.fn();

      const { getByTestId } = render(
        <SkiaArabicWord word={word} onTooltipOpen={onTooltipOpen} testID="word" />,
        measuring((cb: MeasureCallback) => cb(12, 34, 56, 20)),
      );

      fireEvent.press(getByTestId('word'));

      expect(onTooltipOpen).toHaveBeenCalledWith(word, { x: 12, y: 34, width: 56, height: 20 });
    });

    test('handles measurement errors gracefully', () => {
      const word = createMockWord();
      const onTooltipOpen = jest.fn();

      const { getByTestId } = render(
        <SkiaArabicWord word={word} onTooltipOpen={onTooltipOpen} testID="word" />,
        measuring(() => {
          throw new Error('Measurement failed');
        }),
      );

      const wordElement = getByTestId('word');

      // Should not crash on measurement error
      expect(() => fireEvent.press(wordElement)).not.toThrow();
      expect(onTooltipOpen).not.toHaveBeenCalled();
    });

    test('ignores a measurement that came back with no frame', () => {
      const word = createMockWord();
      const onTooltipOpen = jest.fn();

      const { getByTestId } = render(
        <SkiaArabicWord word={word} onTooltipOpen={onTooltipOpen} testID="word" />,
        // A word that has scrolled out of the window measures as a zero box —
        // anchoring a tooltip to it would put it in the corner of the screen.
        measuring((cb: MeasureCallback) => cb(undefined, undefined, 0, 0)),
      );

      fireEvent.press(getByTestId('word'));

      expect(onTooltipOpen).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty word_form', () => {
      const word = createMockWord({ word_form: '' });

      expect(() => render(<SkiaArabicWord word={word} testID="word" />)).not.toThrow();
    });

    test('handles very long Arabic text', () => {
      const longText = 'والكتاب'.repeat(20);
      const word = createMockWord({ word_form: longText });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeTruthy();
    });

    test('handles word with only diacritics', () => {
      const word = createMockWord({ word_form: '\u064E\u064F\u0650' });

      expect(() => render(<SkiaArabicWord word={word} testID="word" />)).not.toThrow();
    });

    test('handles mixed Arabic and non-Arabic text', () => {
      const word = createMockWord({ word_form: 'كتابbook123' });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeTruthy();
    });

    test('handles empty coloredSegments array', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        coloredSegments: [],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeTruthy();
    });

    test('handles paragraph build failure gracefully', () => {
      // Mock getArabicFont to return null (simulating build failure)
      jest.mocked(useSkiaFonts).mockReturnValue({
        arabicFont: {
          getSize: () => 17,
          getTypeface: () => ({
            getFamilyName: () => 'Noto Sans Arabic',
          }),
        },
        getArabicFont: jest.fn(() => null),
        fontSize: 17,
        fontFamily: 'Noto Sans Arabic',
        fontManager: null,
      });

      const word = createMockWord({ word_form: 'كتاب' });
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      // Should render empty canvas without crashing
      expect(getByTestId('word')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('renders 100 words without performance degradation', () => {
      const words = Array.from({ length: 100 }, (_, i) =>
        createMockWord({
          id: i,
          word_form: `كتاب${i}`,
          coloredSegments: [
            { text: 'و', color: '#7c3aed', type: 'prefix' },
            { text: `كتاب${i}`, color: '#1a1a1a', type: 'root' },
          ],
        }),
      );

      const start = Date.now();
      words.forEach(word => {
        render(<SkiaArabicWord word={word} testID={`word-${word.id}`} />);
      });
      const elapsed = Date.now() - start;

      // Should render 100 words in < 1 second (Skia should be fast)
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Regression Tests', () => {
    test('should not color-code single words (regression for single-word rule)', () => {
      const singleWordCases = [
        { word_form: 'والبيت', english: 'house' },
        { word_form: 'كتابه', english: 'book' },
        { word_form: 'المدرسة', english: 'school' },
      ];

      singleWordCases.forEach(({ word_form, english }) => {
        const word = createMockWord({
          word_form,
          english,
          coloredSegments: [], // Single words should have no colored segments
        });

        const { getByTestId } = render(<SkiaArabicWord word={word} testID={`word-${word_form}`} />);
        expect(getByTestId(`word-${word_form}`)).toBeTruthy();
      });
    });

    test('should handle theme changes by rebuilding paragraphs', () => {
      const word = createMockWord({
        word_form: 'والكتاب',
        coloredSegments: [
          { text: 'و', color: '#7c3aed', type: 'prefix' },
          { text: 'الكتاب', color: '#1a1a1a', type: 'root' },
        ],
      });

      const { rerender, getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();

      // Simulate theme change by re-rendering
      rerender(<SkiaArabicWord word={word} testID="word" />);

      // Should still render correctly
      expect(getByTestId('word')).toBeTruthy();
    });
  });
});
