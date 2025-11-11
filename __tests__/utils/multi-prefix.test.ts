/**
 * Multi-prefix detection tests
 * Tests the new sequential prefix detection algorithm that replaces compound prefixes
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { GrammaticalRole } from '@/constants/arabicWordComponents';

describe('Multiple Prefix Detection', () => {
  test('should detect و (conjunction) + ال (article) separately instead of compound', () => {
    const result = analyzeArabicWord('والدجال', 'and the Dajjal');

    expect(result.prefixes).toHaveLength(2);
    expect(result.prefixes[0]?.arabicMatch).toBe('و');
    expect(result.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(result.prefixes[1]?.arabicMatch).toBe('ال');
    expect(result.prefixes[1]?.role).toBe(GrammaticalRole.DEFINITE_ARTICLE);
  });

  test('should detect ف (conjunction) + ال (article) separately', () => {
    const result = analyzeArabicWord('فالكتاب', 'so the book');

    expect(result.prefixes).toHaveLength(2);
    expect(result.prefixes[0]?.arabicMatch).toBe('ف');
    expect(result.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(result.prefixes[1]?.arabicMatch).toBe('ال');
    expect(result.prefixes[1]?.role).toBe(GrammaticalRole.DEFINITE_ARTICLE);
  });

  test('should detect و (conjunction) + ب (preposition) + ال (article) - triple prefix', () => {
    const result = analyzeArabicWord('وبالحق', 'and with the truth');

    expect(result.prefixes).toHaveLength(3);
    expect(result.prefixes[0]?.arabicMatch).toBe('و');
    expect(result.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(result.prefixes[1]?.arabicMatch).toBe('ب');
    expect(result.prefixes[1]?.role).toBe(GrammaticalRole.PREPOSITION);
    expect(result.prefixes[2]?.arabicMatch).toBe('ال');
    expect(result.prefixes[2]?.role).toBe(GrammaticalRole.DEFINITE_ARTICLE);
  });

  test('should handle single prefix without regression', () => {
    const result = analyzeArabicWord('الكتاب', 'the book');

    expect(result.prefixes).toHaveLength(1);
    expect(result.prefixes[0]?.arabicMatch).toBe('ال');
    expect(result.prefixes[0]?.role).toBe(GrammaticalRole.DEFINITE_ARTICLE);
  });

  test('should handle no prefixes', () => {
    const result = analyzeArabicWord('كتاب', 'book');

    expect(result.prefixes).toHaveLength(0);
  });

  test('should assign position numbers correctly', () => {
    const result = analyzeArabicWord('والدجال', 'and the Dajjal');

    expect(result.prefixes[0]?.position).toBe(0);
    expect(result.prefixes[1]?.position).toBe(1);
  });

  test('should detect ف (conjunction) + إذا (particle) with different roles and colors', () => {
    const result = analyzeArabicWord('فإذا', 'so when');

    expect(result.prefixes).toHaveLength(2);
    expect(result.prefixes[0]?.arabicMatch).toBe('ف');
    expect(result.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    expect(result.prefixes[1]?.arabicMatch).toBe('إذا');
    expect(result.prefixes[1]?.role).toBe(GrammaticalRole.PARTICLE);
  });
});
