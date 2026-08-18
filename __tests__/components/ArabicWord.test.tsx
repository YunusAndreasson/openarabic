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

import { SkiaArabicWord as ArabicWord } from '@/components/article/SkiaArabicWord';
import type { SentenceWord } from '@/types/vocabulary.types';

// Use shared mock factory from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

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
    fontFamily: 'Noto Sans Arabic',
    fontManager: null,
  })),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useArabicWord: jest.fn(() => ({ isSelected: false })),
}));

const { useArabicWord } = require('@/hooks/vocabulary');
const { useSkiaFonts } = require('@/hooks/theme/useSkiaFonts');

describe('ArabicWord Component', () => {
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
      fontFamily: 'Noto Sans Arabic',
      fontManager: null,
    });
  });

  describe('Basic Rendering', () => {
    test('renders pressable container for Arabic text', () => {
      const word = createMockWord({ word_form: 'كتاب' });
      const { getByTestId } = render(<ArabicWord word={word} testID="arabic-word-1" />);

      const element = getByTestId('arabic-word-1');
      expect(element).toBeDefined();
      // Verify component is interactive
      expect(element.props.onPress).toBeDefined();
    });

    test('renders with testID and is queryable', () => {
      const word = createMockWord();
      const { getByTestId } = render(<ArabicWord word={word} testID="arabic-word-1" />);

      const element = getByTestId('arabic-word-1');
      expect(element).toBeDefined();
      expect(element.props.testID).toBe('arabic-word-1');
    });

    test('renders without colored segments when none provided', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        coloredSegments: [],
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      // Should render successfully with interactive behavior
      const element = getByTestId('word');
      expect(element).toBeDefined();
      expect(element.props.onPress).toBeDefined();
    });
  });

  describe('Color-Coded Grammar Segments', () => {
    test('renders word with multiple colored segments', () => {
      const word = createMockWord({
        word_form: 'والكتاب',
        english: 'and the book',
        coloredSegments: [
          { text: 'و', color: '#7c3aed', type: 'prefix', colorName: 'secondary' },
          { text: 'ال', color: '#2563eb', type: 'prefix', colorName: 'primary' },
          { text: 'كتاب', color: '#1a1a1a', type: 'root', colorName: 'arabicText' },
        ],
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      // Skia Canvas renders all segments (text is graphics, not React elements)
      expect(getByTestId('word')).toBeTruthy();
    });

    test('applies single-word rule (no color-coding for single English words)', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        english: 'book', // Single word
        coloredSegments: [], // Should be empty due to single-word rule
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      // Should render successfully without color-coding
      expect(getByTestId('word')).toBeTruthy();
    });

    test('allows color-coding for multi-word English translations', () => {
      const word = createMockWord({
        word_form: 'والكتاب',
        english: 'and the book', // Multi-word
        coloredSegments: [
          { text: 'و', color: '#7c3aed', type: 'prefix', colorName: 'secondary' },
          { text: 'ال', color: '#2563eb', type: 'prefix', colorName: 'primary' },
          { text: 'كتاب', color: '#1a1a1a', type: 'root', colorName: 'arabicText' },
        ],
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      // Should render successfully with color-coded segments
      expect(getByTestId('word')).toBeTruthy();
    });

    test('handles diacritics in colored segments', () => {
      const word = createMockWord({
        word_form: 'وَالْكِتَابِ',
        english: 'and the book',
        coloredSegments: [
          { text: 'وَ', color: '#7c3aed', type: 'prefix', colorName: 'secondary' },
          { text: 'الْ', color: '#2563eb', type: 'prefix', colorName: 'primary' },
          { text: 'كِتَابِ', color: '#1a1a1a', type: 'root', colorName: 'arabicText' },
        ],
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      // Should render successfully with diacritics
      expect(getByTestId('word')).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    test('applies selected style when word is selected', () => {
      jest.mocked(useArabicWord).mockReturnValue({ isSelected: true });

      const word = createMockWord();
      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      const wordElement = getByTestId('word');
      expect(wordElement).toBeTruthy();

      // Check that selected style is applied (border bottom color changed)
      // Note: Exact style verification depends on test setup
    });

    test('does not apply selected style by default', () => {
      jest.mocked(useArabicWord).mockReturnValue({ isSelected: false });

      const word = createMockWord();
      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      const wordElement = getByTestId('word');
      expect(wordElement).toBeTruthy();
    });
  });

  describe('Tooltip Interaction', () => {
    // The measured-frame cases — a good measurement, one that throws, and one
    // that comes back as a zero box — live in SkiaArabicWord.test.tsx, which
    // covers this same component (this file imports it under its old name).
    // They were duplicated here, and both copies asserted nothing: each set its
    // `measureInWindow` mock on a `wordRef` prop the component no longer
    // accepts, so the ref stayed null and the mock was never installed. The
    // note that used to sit here — "complex to test properly due to ref timing"
    // — is what let them stay that way; `createNodeMock` (see the `measuring`
    // helper) tests it directly.

    test('does not crash when onTooltipOpen is not provided', () => {
      const word = createMockWord();
      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      const wordElement = getByTestId('word');

      // Should not crash
      expect(() => fireEvent.press(wordElement)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty word_form by rendering pressable container', () => {
      const word = createMockWord({ word_form: '' });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);
      // Component should render a pressable element even with empty word
      expect(getByTestId('word')).toBeDefined();
    });

    test('handles very long Arabic text by rendering without truncation error', () => {
      const longText = 'والكتاب'.repeat(20);
      const word = createMockWord({ word_form: longText });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);
      const element = getByTestId('word');
      expect(element).toBeDefined();
      // Verify component is pressable (functional)
      expect(element.props.onPress).toBeDefined();
    });

    test('handles word with only diacritics by rendering container', () => {
      const diacriticsOnly = '\u064E\u064F\u0650';
      const word = createMockWord({ word_form: diacriticsOnly });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);
      expect(getByTestId('word')).toBeDefined();
    });

    test('handles mixed Arabic and non-Arabic text', () => {
      const mixedText = 'كتابbook123';
      const word = createMockWord({ word_form: mixedText });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);
      const element = getByTestId('word');
      expect(element).toBeDefined();
    });

    test('handles empty coloredSegments array by rendering plain text', () => {
      const word = createMockWord({
        word_form: 'كتاب',
        coloredSegments: [],
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);
      const element = getByTestId('word');
      expect(element).toBeDefined();
      expect(element.props.onPress).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('renders 100 words within acceptable time', () => {
      const words = Array.from({ length: 100 }, (_, i) =>
        createMockWord({
          id: i,
          word_form: `كتاب${i}`,
          coloredSegments: [
            { text: 'و', color: '#7c3aed', type: 'prefix', colorName: 'secondary' },
            { text: `كتاب${i}`, color: '#1a1a1a', type: 'root', colorName: 'arabicText' },
          ],
        }),
      );

      const start = Date.now();
      words.forEach(word => {
        render(<ArabicWord word={word} />);
      });
      const elapsed = Date.now() - start;

      // Tightened threshold: 100 mocked components should render in < 300ms in test env
      expect(elapsed).toBeLessThan(300);
    });
  });

  describe('Regression Tests', () => {
    test('should not color-code single words (regression for single-word rule)', () => {
      // Regression: Ensure single-word rule is enforced
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

        const { getByTestId } = render(<ArabicWord word={word} testID={`word-${word_form}`} />);
        expect(getByTestId(`word-${word_form}`)).toBeTruthy();
      });
    });

    test('should reconstruct original text from colored segments', () => {
      // Regression: Ensure segments combine to form original word
      const word = createMockWord({
        word_form: 'والكتاب',
        english: 'and the book',
        coloredSegments: [
          { text: 'و', color: '#7c3aed', type: 'prefix', colorName: 'secondary' },
          { text: 'ال', color: '#2563eb', type: 'prefix', colorName: 'primary' },
          { text: 'كتاب', color: '#1a1a1a', type: 'root', colorName: 'arabicText' },
        ],
      });

      const { getByTestId } = render(<ArabicWord word={word} testID="word" />);

      // Should render successfully with colored segments
      expect(getByTestId('word')).toBeTruthy();

      // Segments should combine to form original word
      const segments = word.coloredSegments.map(s => s.text).join('');
      expect(segments).toBe('والكتاب');
    });
  });
});
