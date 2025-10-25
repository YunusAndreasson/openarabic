/**
 * Test for إِلَيْهِ prefix detection issue
 *
 * Bug: "إِلَيْهِ" (to it) is being analyzed as:
 *   - Prefix: "إل" (2 letters)
 *   - Root: "ي" (phantom root)
 *   - Suffix: "ه"
 *
 * Expected: Should be analyzed as:
 *   - Prefix: "إلى" (3 letters - the full preposition)
 *   - Suffix: "ه"
 *
 * The word "إلى" means "to/towards" and is a complete preposition.
 * The "ي" should be part of the prefix, not a root.
 */

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

describe('إِلَيْهِ prefix detection', () => {
  it('should debug the normalized form', () => {
    const word = 'إِلَيْهِ';
    const constantYaaForm = 'إلي'; // From constants - with regular yaa (ي U+064A)
    const constantMaksuraForm = 'إلى'; // From constants - with alef maksura (ى U+0649)

    // Normalize word
    const normalized = word.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

    // Test matching - should match yaa form, not maksura form
    const matchesYaa = normalized.startsWith(constantYaaForm);
    const matchesMaksura = normalized.startsWith(constantMaksuraForm);

    // When إلى takes a suffix, the alef maksura (ى) becomes regular yaa (ي)
    expect(matchesYaa).toBe(true); // Should match إلي
    expect(matchesMaksura).toBe(false); // Should NOT match إلى
  });

  it('should detect إلى as full prefix for إِلَيْهِ', () => {
    const analysis = analyzeArabicWord('إِلَيْهِ', 'to it');

    // Should detect "إلي" (3 letters with regular yaa ي) as prefix, NOT "إل" (2 letters)
    // Note: When إلى takes a suffix, alef maksura (ى) becomes regular yaa (ي)
    expect(analysis.prefixes).toHaveLength(1);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('إلي'); // Full preposition with regular yaa

    // Should detect "ه" as suffix
    expect(analysis.suffix?.arabicMatch).toBe('ه');

    // Should have NO remaining (no root)
    expect(analysis.remainingArabic).toBe('');

    // Generate colored segments
    const mockColors = {
      warning: '#d1b56f', // preposition
      violet: '#b28fef', // possessive suffix
      text: '#fcfffd',
      arabicText: '#fcfffd',
      grammar: MOCK_GRAMMAR_COLORS,
    } as any;

    const segments = computeColoredSegments('إِلَيْهِ', 'to it', mockColors);

    console.log('Segments:', JSON.stringify(segments, null, 2));

    // Should have 2 segments: prefix + suffix (NO root segment)
    expect(segments).toHaveLength(2);

    // Prefix should include the yaa: "إِلَى" or "إِلَیْ" (with diacritics)
    const prefixSegment = segments.find(s => s.type === 'prefix');
    expect(prefixSegment).toBeDefined();
    // The prefix should contain yaa (ي or ی)
    expect(prefixSegment?.text).toMatch(/[يی]/);

    // Should NOT have a root segment
    const rootSegments = segments.filter(s => s.type === 'root');
    expect(rootSegments).toHaveLength(0);

    // Suffix should be "ه" + diacritic
    const suffixSegment = segments.find(s => s.type === 'suffix');
    expect(suffixSegment).toBeDefined();
    expect(suffixSegment?.text).toBe('هِ'); // ه with kasra
  });
});
