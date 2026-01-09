/**
 * Test to explore false positive risk of adding "from" to ب patterns
 *
 * The constraint: BOTH conditions must be met:
 * 1. Arabic word starts with ب
 * 2. English translation contains "from"
 *
 * This test identifies realistic scenarios where this could cause false positives
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Potential false positives if "from" added to ب', () => {
  test('FALSE POSITIVE: بعيد (far) - "from" is من, not ب', () => {
    // بعيد من البيت = "far from the house"
    // If we analyze just بعيد with translation "far from"
    // the "from" is preview of the next word (من), not part of بعيد itself

    const analysis = analyzeArabicWord('بعيد', 'far from');

    // Currently: ب does NOT match "from"
    expect(analysis.prefixes.some(p => p.arabicMatch === 'ب')).toBeFalsy();

    // If we add "from" to ب patterns: ب WOULD match "from"
    // This would be WRONG because:
    // - ب is part of the root "بعيد" (ba'id - far)
    // - "from" corresponds to the separate word "من" that follows
  });

  test('FALSE POSITIVE: بدأ (started) - "from" is من, not ب', () => {
    // بدأ من هنا = "started from here"
    const analysis = analyzeArabicWord('بدأ', 'started from');

    // Currently: ب does NOT match
    expect(analysis.prefixes.some(p => p.arabicMatch === 'ب')).toBeFalsy();

    // If "from" added: Would incorrectly detect ب as prefix
    // But "from" is actually من (the next word), not ب
  });

  test('TRUE POSITIVE: بالله (with/by Allah) - could legitimately be "from Allah" contextually', () => {
    // أعوذ بالله = "I seek refuge by/with Allah [from evil]"
    // Context: "from" describes what you flee from, not the preposition ب
    const analysis = analyzeArabicWord('بالله', 'from Allah');

    // Currently: Does not detect ب because "from" not in patterns
    expect(analysis.prefixes.some(p => p.arabicMatch === 'ب')).toBeFalsy();

    // If we add "from": Would detect ب
    // Question: Is this semantically correct?
    // ب = "with/by" (literal)
    // "from" = contextual/idiomatic interpretation
  });

  test('TRUE POSITIVE: بمرأى (in sight of) - could include "from" in translation', () => {
    // بمرأى من الناس = "in sight of people" or "visible from people"
    const analysis = analyzeArabicWord('بمرأى', 'visible from');

    // Currently: Does not detect ب
    expect(analysis.prefixes.some(p => p.arabicMatch === 'ب')).toBeFalsy();

    // If "from" added: Would detect ب
    // But "visible from" is idiomatic - literal is "in sight"
  });

  test('SAFE: بيت (house) - unlikely to have "from" in translation', () => {
    // Most words starting with ب won't have "from" in translation
    const analysis = analyzeArabicWord('بيت', 'house');

    expect(analysis.prefixes).toHaveLength(0);
  });

  test('Recommendation: Test with literal translations', () => {
    // Best practice: Use literal translations for grammar coloring

    // ✓ Literal: "with Allah"
    const literal = analyzeArabicWord('بالله', 'with Allah');
    expect(literal.prefixes[0]?.arabicMatch).toBe('ب');
    expect(literal.prefixes[0]?.englishMatches).toContain('with');

    // ✗ Idiomatic: "from Allah"
    const idiomatic = analyzeArabicWord('بالله', 'from Allah');
    expect(idiomatic.prefixes).toHaveLength(0);

    // Conclusion: Keep literal translations, avoid adding "from"
  });
});
