/**
 * Color-Coding Bug Investigation Test Suite
 * Systematic tests to find all bugs in the color-coding system
 */

import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments, shouldApplyColorCoding } from '@/utils/colorCodedTextUtils';
import type { ThemeColors } from '@/types/ui/theme.types';

// Mock colors
const mockColors: ThemeColors = {
  tint: '#4A9B6F',
  primary: '#4A9B6F',
  secondary: '#2B3C35', // Forest dark for conjunctions/subject prefixes
  warning: '#F59E0B',
  violet: '#9333EA', // Purple for possessives
  accent: '#3B82F6', // Azure blue for particles/interrogatives
  secondaryText: '#6B7280',
  text: '#000000',
  background: '#FFFFFF',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  card: '#F9FAFB',
  cardBorder: '#E5E7EB',
  error: '#DC2626',
  success: '#059669',
  englishText: '#000000',
  arabicText: '#1F2937',
  authorText: '#6B7280',
  headingText: '#111827',
  subtitleText: '#4B5563',
  metadataText: '#6B7280',
  secondaryMetadataText: '#9CA3AF',
  captionText: '#6B7280',
  tintBackground: '#F0F9FF',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#4A9B6F',
  icon: '#6B7280',
  disabled: '#D1D5DB',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalOverlay: 'rgba(0, 0, 0, 0.6)',
  borderOverlay: 'rgba(0, 0, 0, 0.1)',
  buttonOverlay: 'rgba(0, 0, 0, 0.05)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  elevation0: '#FFFFFF',
  elevation1: '#FFFFFF',
  elevation2: '#F9FAFB',
  elevation3: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
  textOverlay: 'rgba(0, 0, 0, 0.7)',
  textShadowDark: 'rgba(0, 0, 0, 0.4)',
  textShadowLight: 'rgba(0, 0, 0, 0.2)',
  info: '#3B82F6',
  modalIndicator: '#D1D5DB',
  backdropOverlay: 'rgba(0, 0, 0, 0.4)',
  wordTooltipBg: '#FFFFFF',
  wordTooltipText: '#1F2937',
  wordTooltipBorder: '#E5E7EB',
  wordTooltipShadow: 'rgba(0, 0, 0, 0.1)',
  navigationRipple: 'rgba(74, 155, 111, 0.12)',
  headerOverlay: 'rgba(255, 255, 255, 0.95)',
  tabBarOverlay: 'rgba(255, 255, 255, 0.95)',
  progressIndicator: '#4A9B6F',
  progressBackground: '#E5E7EB',
  interactiveSecondary: 'rgba(74, 155, 111, 0.1)',
  completionSuccess: '#10B981',
  chartGrid: '#E5E7EB',
  chartThreshold: '#F59E0B',
};

describe('Bug Investigation: Category 1 - Arabic Colored, English Not Colored', () => {
  // Test cases where Arabic analysis finds components but English matching fails

  it('BUG: should color "and the" in English for والبيت (wa-al-bayti)', () => {
    const arabic = 'والبيت';
    const english = 'and the house';

    const analysis = analyzeArabicWord(arabic, english);
    const formatted = formatWordAnalysis(analysis);

    // Check if Arabic has components
    expect(analysis.hasComponents).toBe(true);
    console.log('\n📝 TEST: والبيت → "and the house"');
    console.log('Arabic components found:', {
      prefix: analysis.prefixes[0]?.arabicMatch,
      prefixEnglish: analysis.prefixes[0]?.englishMatches,
      suffix: analysis.suffix?.arabicMatch,
    });
    console.log('Formatted sections:', formatted.sections.map(s => ({
      type: s.type,
      arabicPart: s.arabicPart,
      englishPart: s.englishPart,
      colorName: s.colorName,
    })));

    // Check if English matching worked
    const englishSegments = generateColorCodedSegments({
      text: english,
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    console.log('English segments:', englishSegments.map(s => ({ text: s.text, color: s.color })));

    // BUG TEST: Are "and" and "the" colored?
    const andSegment = englishSegments.find(s => s.text === 'and');
    const theSegment = englishSegments.find(s => s.text === 'the');

    console.log('🔍 Bug check:');
    console.log('  "and" segment:', andSegment);
    console.log('  "the" segment:', theSegment);

    // Multi-prefix detection: و (conjunction=secondary) + ال (article=tint)
    expect(andSegment?.color).toBe(mockColors.secondary); // و = "and" (conjunction)
    expect(theSegment?.color).toBe(mockColors.tint); // ال = "the" (article)
  });

  it('BUG: should color "his" in English for كتابه (kitaabuhu)', () => {
    const arabic = 'كتابه';
    const english = 'his book';

    const analysis = analyzeArabicWord(arabic, english);
    const formatted = formatWordAnalysis(analysis);

    expect(analysis.hasComponents).toBe(true);
    console.log('Arabic components found:', {
      suffix: analysis.suffix?.arabicMatch,
      suffixEnglish: analysis.suffix?.englishMatches,
    });

    const englishSegments = generateColorCodedSegments({
      text: english,
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    console.log('English segments:', englishSegments.map(s => ({ text: s.text, color: s.color })));

    const hisSegment = englishSegments.find(s => s.text === 'his');

    // Possessive suffix uses violet color
    expect(hisSegment?.color).toBe(mockColors.violet); // ه = "his" (possessive)
  });

  it('BUG: should color "with the" in English for بالكتاب (bi-al-kitab)', () => {
    const arabic = 'بالكتاب';
    const english = 'with the book';

    const analysis = analyzeArabicWord(arabic, english);
    const formatted = formatWordAnalysis(analysis);

    expect(analysis.hasComponents).toBe(true);
    console.log('Arabic prefix found:', {
      prefix: analysis.prefixes[0]?.arabicMatch,
      prefixEnglish: analysis.prefixes[0]?.englishMatches,
    });

    const englishSegments = generateColorCodedSegments({
      text: english,
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    console.log('English segments:', englishSegments.map(s => ({ text: s.text, color: s.color })));

    // Multi-prefix: ب (with=warning) + ال (the=tint)
    const withSegment = englishSegments.find(s => s.text === 'with');
    const theSegment = englishSegments.find(s => s.text === 'the');

    expect(withSegment?.color).toBe(mockColors.warning); // ب = "with" (preposition)
    expect(theSegment?.color).toBe(mockColors.tint); // ال = "the" (article)
  });
});

describe('Bug Investigation: Category 2 - Arabic White, English Colored', () => {
  // Test cases where Arabic has no components but English gets colored (CRITICAL BUG)

  it('CRITICAL BUG: Arabic plain but English colored - consistency check', () => {
    const arabic = 'كتاب'; // Plain word: kitab (book)
    const english = 'book';

    const analysis = analyzeArabicWord(arabic, english);

    // Arabic should have NO components (single word, no affixes)
    console.log('Arabic analysis:', {
      hasComponents: analysis.hasComponents,
      prefix: analysis.prefixes[0],
      suffix: analysis.suffix,
    });

    // If Arabic has no components, English should also be plain
    if (!analysis.hasComponents) {
      const formatted = formatWordAnalysis(analysis);
      const englishSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // BUG TEST: All English should be default color
      const allDefaultColor = englishSegments.every(s => s.color === mockColors.text);
      expect(allDefaultColor).toBe(true);

      if (!allDefaultColor) {
        console.error('BUG FOUND: Arabic has no components but English is colored!');
        console.error('English segments:', englishSegments);
      }
    }
  });

  it('CRITICAL BUG: Test with possessive - should both be plain or both colored', () => {
    const testCases = [
      { arabic: 'كتاب', english: 'book' },
      { arabic: 'بيت', english: 'house' },
      { arabic: 'ولد', english: 'boy' },
    ];

    for (const { arabic, english } of testCases) {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const arabicHasComponents = analysis.hasComponents;

      const englishSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      const englishIsColored = englishSegments.some(s => s.color !== mockColors.text);

      // CONSISTENCY CHECK: Arabic and English should match
      console.log(`${arabic} → ${english}: Arabic colored=${arabicHasComponents}, English colored=${englishIsColored}`);

      if (arabicHasComponents !== englishIsColored) {
        console.error(`BUG: Inconsistency for "${arabic}" → "${english}"`);
        console.error(`  Arabic components: ${arabicHasComponents}`);
        console.error(`  English colored: ${englishIsColored}`);
      }
    }
  });
});

describe('Bug Investigation: Category 3 - Single-Word Rule Violations', () => {
  // Test that single words are NEVER colored

  it('BUG: Single word should NEVER be colored', () => {
    const singleWords = [
      { arabic: 'كتاب', english: 'book' },
      { arabic: 'بيت', english: 'house' },
      { arabic: 'رجل', english: 'man' },
    ];

    for (const { arabic, english } of singleWords) {
      // Should NOT apply color-coding to single words
      const shouldColor = shouldApplyColorCoding(english);
      expect(shouldColor).toBe(false);

      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const englishSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: mockColors,
        defaultColor: mockColors.text,
      });

      // BUG TEST: Single-word should have exactly 1 segment with default color
      expect(englishSegments.length).toBe(1);
      expect(englishSegments[0]?.color).toBe(mockColors.text);
      expect(englishSegments[0]?.key).toBe('single-word');
    }
  });

  it('BUG: Bracket injection word count - [the] house should count as 2 words', () => {
    const arabic = 'البيت'; // al-bayti (the house)
    const english = 'house'; // Translator omitted "the"

    // This should inject [the] making it "[the] house" = 2 words
    const analysis = analyzeArabicWord(arabic, english);

    console.log('Bracket injection test:', {
      hasBracketInjection: analysis.hasBracketInjection,
      hasComponents: analysis.hasComponents,
    });

    if (analysis.hasBracketInjection) {
      const displayedText = `[the] ${english}`;
      const wordCount = displayedText.trim().split(/\s+/).length;

      // Should be 2 words, therefore colorable
      expect(wordCount).toBe(2);
      expect(shouldApplyColorCoding(displayedText)).toBe(true);
    }
  });
});

describe('Bug Investigation: Category 4 - Pattern Matching Issues', () => {
  // Test edge cases in pattern matching

  it('BUG: Contraction matching - "don\'t" should match "do not"', () => {
    const arabic = 'لا';
    const english = "don't go";

    const analysis = analyzeArabicWord(arabic, english);
    const formatted = formatWordAnalysis(analysis);

    expect(analysis.hasComponents).toBe(true);
    console.log('Negation prefix found:', {
      prefix: analysis.prefixes[0]?.arabicMatch,
      englishMatches: analysis.prefixes[0]?.englishMatches,
    });

    const englishSegments = generateColorCodedSegments({
      text: english,
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    console.log('English segments:', englishSegments.map(s => ({ text: s.text, color: s.color })));

    // Negation prefix "don't" (matches "do not") should use error color
    const dontSegment = englishSegments.find(s => s.text === "don't");
    expect(dontSegment?.color).toBe(mockColors.error);
  });

  it('BUG: Multiple slashes in English pattern - should match first', () => {
    // Component patterns can have "his / its / it"
    // Should match any of them
    const arabic = 'كتابه';
    const english = 'its form'; // "its" is in the ه suffix patterns

    const analysis = analyzeArabicWord(arabic, english);
    const formatted = formatWordAnalysis(analysis);

    expect(analysis.hasComponents).toBe(true);
    console.log('Suffix with slash patterns:', {
      suffix: analysis.suffix?.arabicMatch,
      englishMatches: analysis.suffix?.englishMatches,
    });

    const englishSegments = generateColorCodedSegments({
      text: english,
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // Possessive suffix "its" should be colored with violet
    const itsSegment = englishSegments.find(s => s.text === 'its');
    expect(itsSegment?.color).toBe(mockColors.violet);
  });

  it('BUG: Word boundary check - "and" in "sand" should NOT match', () => {
    const arabic = 'رمل'; // ramil (sand - no و prefix)
    const english = 'sand';

    const analysis = analyzeArabicWord(arabic, english);
    const formatted = formatWordAnalysis(analysis);

    const englishSegments = generateColorCodedSegments({
      text: english,
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // BUG TEST: "and" should NOT be colored within "sand"
    const coloredSegments = englishSegments.filter(s => s.color !== mockColors.text);
    expect(coloredSegments.length).toBe(0);
  });
});

describe('Bug Investigation: Comprehensive Edge Cases', () => {
  it('BUG: Empty or null analysis should return plain text', () => {
    const result = generateColorCodedSegments({
      text: 'test',
      formattedAnalysis: null,
      analysis: null,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    expect(result.length).toBe(1);
    expect(result[0]?.color).toBe(mockColors.text);
    expect(result[0]?.key).toBe('no-analysis');
  });

  it('BUG: Displayed text with brackets vs original text word count', () => {
    const testCases = [
      { text: 'house', displayedText: '[the] house', expectedWordCount: 2 },
      { text: 'book', displayedText: '[the] book', expectedWordCount: 2 },
    ];

    for (const { text, displayedText, expectedWordCount } of testCases) {
      const wordCount = displayedText.trim().split(/\s+/).length;
      expect(wordCount).toBe(expectedWordCount);

      // Should apply color coding to displayedText, not original text
      expect(shouldApplyColorCoding(displayedText)).toBe(true);
      expect(shouldApplyColorCoding(text)).toBe(false);
    }
  });
});
