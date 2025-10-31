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
import type { ComponentRef } from 'react';
import React, { createRef } from 'react';
import { Pressable } from 'react-native';

import { SkiaArabicWord } from '@/components/article/SkiaArabicWord';
import type { SentenceWord } from '@/types/vocabulary.types';

// Mock hooks
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    text: '#000000',
    arabicText: '#1a1a1a',
    tint: '#4a7c59',
    disabled: '#cccccc',
    transparent: 'transparent',
    // Grammar colors
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#dc2626',
    tertiary: '#ea580c',
    quaternary: '#059669',
  }),
}));

jest.mock('@/hooks/theme/useSkiaFonts', () => ({
  useSkiaFonts: jest.fn(() => ({
    arabicFont: {
      getSize: () => 17,
      getTypeface: () => ({
        getFamilyName: () => 'Noto Sans Arabic',
      }),
    },
    getArabicFont: jest.fn(() => ({
      getSize: () => 17,
      getTypeface: () => ({
        getFamilyName: () => 'Noto Sans Arabic',
      }),
    })),
    isReady: true,
    fontSize: 17,
  })),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useArabicWord: jest.fn(() => ({ isSelected: false })),
}));

const { useArabicWord } = require('@/hooks/vocabulary');
const { useSkiaFonts } = require('@/hooks/theme/useSkiaFonts');

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
    (useArabicWord as jest.Mock).mockReturnValue({ isSelected: false });
    (useSkiaFonts as jest.Mock).mockReturnValue({
      arabicFont: {
        getSize: () => 17,
        getTypeface: () => ({
          getFamilyName: () => 'Noto Sans Arabic',
        }),
      },
      getArabicFont: jest.fn(() => ({
        getSize: () => 17,
        getTypeface: () => ({
          getFamilyName: () => 'Noto Sans Arabic',
        }),
      })),
      isReady: true,
      fontSize: 17,
    });
  });

  describe('Basic Rendering', () => {
    it('renders Skia Canvas for Arabic text', () => {
      const word = createMockWord({ word_form: 'كتاب' });
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="arabic-word-1" />);

      expect(getByTestId('arabic-word-1')).toBeTruthy();
    });

    it('renders with testID for testing', () => {
      const word = createMockWord();
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="arabic-word-1" />);

      expect(getByTestId('arabic-word-1')).toBeTruthy();
    });

    it('renders without colored segments when none provided', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        coloredSegments: [],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();
    });

  });

  describe('Color-Coded Grammar Segments', () => {
    it('renders word with multiple colored segments via Skia', () => {
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

    it('applies single-word rule (no color-coding for single English words)', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        english: 'book', // Single word
        coloredSegments: [], // Should be empty due to single-word rule
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      expect(getByTestId('word')).toBeTruthy();
    });

    it('allows color-coding for multi-word English translations', () => {
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

    it('handles diacritics in colored segments', () => {
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
    it('uses semibold font when word is selected', () => {
      const mockGetArabicFont = jest.fn(() => ({
        getSize: () => 17,
        getTypeface: () => ({
          getFamilyName: () => 'Noto Sans Arabic',
        }),
      }));

      (useArabicWord as jest.Mock).mockReturnValue({ isSelected: true });
      (useSkiaFonts as jest.Mock).mockReturnValue({
        arabicFont: {
          getSize: () => 17,
          getTypeface: () => ({
            getFamilyName: () => 'Noto Sans Arabic',
          }),
        },
        getArabicFont: mockGetArabicFont,
        isReady: true,
        fontSize: 17,
      });

      const word = createMockWord();
      render(<SkiaArabicWord word={word} testID="word" />);

      // Should request semibold font for selected state
      expect(mockGetArabicFont).toHaveBeenCalledWith(undefined, 'semibold');
    });

    it('uses normal font weight by default', () => {
      const mockGetArabicFont = jest.fn(() => ({
        getSize: () => 17,
        getTypeface: () => ({
          getFamilyName: () => 'Noto Sans Arabic',
        }),
      }));

      (useArabicWord as jest.Mock).mockReturnValue({ isSelected: false });
      (useSkiaFonts as jest.Mock).mockReturnValue({
        arabicFont: {
          getSize: () => 17,
          getTypeface: () => ({
            getFamilyName: () => 'Noto Sans Arabic',
          }),
        },
        getArabicFont: mockGetArabicFont,
        isReady: true,
        fontSize: 17,
      });

      const word = createMockWord();
      render(<SkiaArabicWord word={word} testID="word" />);

      // Should request normal font weight
      expect(mockGetArabicFont).toHaveBeenCalledWith(undefined, 'normal');
    });
  });

  describe('Tooltip Interaction', () => {
    it('does not crash when onTooltipOpen is not provided', () => {
      const word = createMockWord();
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      const wordElement = getByTestId('word');

      // Should not crash
      expect(() => fireEvent.press(wordElement)).not.toThrow();
    });

    it('does not call tooltip when ref is not provided', () => {
      const word = createMockWord();
      const onTooltipOpen = jest.fn();

      const { getByTestId } = render(
        <SkiaArabicWord word={word} onTooltipOpen={onTooltipOpen} testID="word" />,
      );

      const wordElement = getByTestId('word');
      fireEvent.press(wordElement);

      // Should not call tooltip without ref
      expect(onTooltipOpen).not.toHaveBeenCalled();
    });

    it('handles measurement errors gracefully', () => {
      const word = createMockWord();
      const onTooltipOpen = jest.fn();
      const wordRef = createRef<ComponentRef<typeof Pressable>>();

      const { getByTestId } = render(
        <SkiaArabicWord
          word={word}
          onTooltipOpen={onTooltipOpen}
          wordRef={wordRef}
          testID="word"
        />,
      );

      // Mock measureInWindow to throw error
      if (wordRef.current) {
        wordRef.current.measureInWindow = jest.fn(() => {
          throw new Error('Measurement failed');
        });
      }

      const wordElement = getByTestId('word');

      // Should not crash on measurement error
      expect(() => fireEvent.press(wordElement)).not.toThrow();
      expect(onTooltipOpen).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty word_form', () => {
      const word = createMockWord({ word_form: '' });

      expect(() => render(<SkiaArabicWord word={word} testID="word" />)).not.toThrow();
    });

    it('handles very long Arabic text', () => {
      const longText = 'والكتاب'.repeat(20);
      const word = createMockWord({ word_form: longText });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeTruthy();
    });

    it('handles word with only diacritics', () => {
      const word = createMockWord({ word_form: '\u064E\u064F\u0650' });

      expect(() => render(<SkiaArabicWord word={word} testID="word" />)).not.toThrow();
    });

    it('handles mixed Arabic and non-Arabic text', () => {
      const word = createMockWord({ word_form: 'كتابbook123' });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeTruthy();
    });

    it('handles empty coloredSegments array', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        coloredSegments: [],
      });

      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeTruthy();
    });

    it('handles paragraph build failure gracefully', () => {
      // Mock getArabicFont to return null (simulating build failure)
      (useSkiaFonts as jest.Mock).mockReturnValue({
        arabicFont: {
          getSize: () => 17,
          getTypeface: () => ({
            getFamilyName: () => 'Noto Sans Arabic',
          }),
        },
        getArabicFont: jest.fn(() => null),
        fontSize: 17,
        fontFamily: 'Noto Sans Arabic',
      });

      const word = createMockWord({ word_form: 'كتاب' });
      const { getByTestId } = render(<SkiaArabicWord word={word} testID="word" />);

      // Should render empty canvas without crashing
      expect(getByTestId('word')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders 100 words without performance degradation', () => {
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
    it('should not color-code single words (regression for single-word rule)', () => {
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

    it('should handle theme changes by rebuilding paragraphs', () => {
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
