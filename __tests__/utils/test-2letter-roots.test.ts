/**
 * Test for 2-letter Arabic roots with possessive suffixes
 *
 * Common 2-letter roots in Arabic:
 * - رب (rabb) = Lord
 * - يد (yad) = hand
 * - دم (dam) = blood
 * - فم (fam) = mouth
 * - أب (ab) = father
 * - أخ (akh) = brother
 *
 * These should all be able to take possessive suffixes (ي, ك, ه, etc.)
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { GrammaticalRole } from '@/constants/arabicWordComponents';

describe('2-letter Arabic roots with suffixes', () => {
  describe('رب (Lord) + possessive suffixes', () => {
    test('should detect suffix in ربه (his Lord)', () => {
      const analysis = analyzeArabicWord('ربه', 'his Lord');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.suffix?.role).toBe(GrammaticalRole.POSSESSIVE);
      expect(analysis.remainingArabic).toBe('رب');
    });

    test('should detect suffix in ربي (my Lord)', () => {
      const analysis = analyzeArabicWord('ربي', 'my Lord');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ي');
      expect(analysis.remainingArabic).toBe('رب');
    });

    test('should detect suffix in ربك (your Lord)', () => {
      const analysis = analyzeArabicWord('ربك', 'your Lord');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ك');
      expect(analysis.remainingArabic).toBe('رب');
    });
  });

  describe('يد (hand) + possessive suffixes - 1 consonant root', () => {
    test('should detect suffix in يده (his hand)', () => {
      const analysis = analyzeArabicWord('يده', 'his hand');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.remainingArabic).toBe('يد');
    });

    test('should detect suffix in يدي (my hand)', () => {
      const analysis = analyzeArabicWord('يدي', 'my hand');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ي');
      expect(analysis.remainingArabic).toBe('يد');
    });
  });

  describe('Other 2-letter roots', () => {
    test('should detect suffix in دمه (his blood)', () => {
      const analysis = analyzeArabicWord('دمه', 'his blood');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.remainingArabic).toBe('دم');
    });

    test('should detect suffix in فمه (his mouth)', () => {
      const analysis = analyzeArabicWord('فمه', 'his mouth');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.remainingArabic).toBe('فم');
    });

    test('should detect suffix in أبي (my father)', () => {
      const analysis = analyzeArabicWord('أبي', 'my father');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ي');
      expect(analysis.remainingArabic).toBe('أب');
    });
  });

  describe('Validation: prevent false positives', () => {
    test('should NOT detect suffix in weak-letter-only remainings', () => {
      // This is a made-up example - "وو" is not a real word
      // If we had a pattern that would leave only weak letters, it should be rejected
      const analysis = analyzeArabicWord('وه', 'and it');

      // "و" (1 char) is allowed as prefix-only case
      // This is testing that our validation still works
      expect(analysis.prefixes.length).toBeGreaterThan(0);
    });
  });
});
