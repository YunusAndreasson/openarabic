/**
 * Tests for multi-prefix detection (previously compound prefix tests)
 * Validates that sequential prefixes are detected separately with distinct grammatical roles
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { GrammaticalRole } from '@/constants/arabicWordComponents';

describe('Multi-Prefix Detection (formerly compounds)', () => {
  test('should detect و (conjunction) + من (interrogative) as separate prefixes', () => {
    const analysis = analyzeArabicWord('ومن', 'and who');

    expect(analysis.hasComponents).toBeTruthy();
    expect(analysis.prefixes).toHaveLength(2);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    expect(analysis.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(analysis.prefixes[1]?.arabicMatch).toBe('من');
    expect(analysis.prefixes[1]?.role).toBe(GrammaticalRole.INTERROGATIVE);
  });

  test('should format multiple prefixes separately in sections', () => {
    const analysis = analyzeArabicWord('والدجال', 'and the Dajjal');
    const formatted = formatWordAnalysis(analysis);

    const prefixSections = formatted.sections.filter(
      s => s.type === 'components' && s.icon === '→',
    );
    expect(prefixSections).toHaveLength(2);
    expect(prefixSections[0]?.englishPart).toContain('and');
    expect(prefixSections[1]?.englishPart).toContain('the');
  });

  test('should color-code و (conjunction) with primary color', () => {
    const analysis = analyzeArabicWord('والدجال', 'and the Dajjal');
    const formatted = formatWordAnalysis(analysis);

    const segments = formatted.reconstructedArabic?.segments ?? [];
    expect(segments.length).toBeGreaterThan(0);
    const firstPrefix = segments.find(s => s.type === 'prefix' && s.text.includes('و'));
    expect(firstPrefix).toBeDefined();
    expect(firstPrefix?.colorName).toBe('grammar.conjunction'); // Conjunction gets grammar conjunction color
  });

  test('should color-code ال (article) with definite article color', () => {
    const analysis = analyzeArabicWord('والدجال', 'and the Dajjal');
    const formatted = formatWordAnalysis(analysis);

    const segments = formatted.reconstructedArabic?.segments ?? [];
    const secondPrefix = segments.filter(s => s.type === 'prefix')[1];
    expect(secondPrefix).toBeDefined();
    expect(secondPrefix?.colorName).toBe('grammar.definiteArticle'); // Article gets grammar definite article color
  });

  test('should detect triple prefix: و + ب + ال', () => {
    const analysis = analyzeArabicWord('وبالحق', 'and with the truth');

    expect(analysis.prefixes).toHaveLength(3);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    expect(analysis.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(analysis.prefixes[1]?.arabicMatch).toBe('ب');
    expect(analysis.prefixes[1]?.role).toBe(GrammaticalRole.PREPOSITION);
    expect(analysis.prefixes[2]?.arabicMatch).toBe('ال');
    expect(analysis.prefixes[2]?.role).toBe(GrammaticalRole.DEFINITE_ARTICLE);
  });

  test('should color-code ف (conjunction) and إذا (particle) with different colors', () => {
    const analysis = analyzeArabicWord('فإذا', 'so when');
    const formatted = formatWordAnalysis(analysis);

    // Verify both prefixes detected
    expect(analysis.prefixes).toHaveLength(2);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
    expect(analysis.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(analysis.prefixes[1]?.arabicMatch).toBe('إذا');
    expect(analysis.prefixes[1]?.role).toBe(GrammaticalRole.PARTICLE);

    // Verify different colors assigned
    const segments = formatted.reconstructedArabic?.segments ?? [];
    expect(segments.length).toBe(2); // Should have 2 prefix segments
    const firstPrefix = segments[0];
    const secondPrefix = segments[1];

    expect(firstPrefix?.type).toBe('prefix');
    expect(firstPrefix?.colorName).toBe('grammar.conjunction');
    expect(secondPrefix?.type).toBe('prefix');
    expect(secondPrefix?.colorName).toBe('grammar.particle');

    // Critical: colors must be different
    expect(firstPrefix?.colorName).not.toBe(secondPrefix?.colorName);
  });
});
