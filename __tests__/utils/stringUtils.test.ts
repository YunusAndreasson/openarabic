/**
 * String Utils Tests
 *
 * Tests string manipulation utility functions.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import {
  capitalizeFirstLetter,
  formatArticleMetadata,
  formatCount,
  getAuthorDisplayName,
  getCategoryDisplayName,
  getCategorySubtitle,
} from '../../utils/stringUtils';

describe('stringUtils', () => {
  describe('formatCount', () => {
    test.each([
      [0, '0'],
      [999, '999'],
      [1000, '1,000'],
      [7519, '7,519'],
      [1234567, '1,234,567'],
    ])('groups %d as %s', (value, expected) => {
      expect(formatCount(value)).toBe(expected);
    });

    test('rounds a fractional count rather than printing decimals', () => {
      expect(formatCount(1999.6)).toBe('2,000');
    });
  });

  describe('capitalizeFirstLetter', () => {
    test('should capitalize the first letter of a string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('world')).toBe('World');
    });

    test('should handle single character strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
      expect(capitalizeFirstLetter('z')).toBe('Z');
    });

    test('should handle empty strings', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    test('should handle strings that are already capitalized', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    });

    test('should handle strings with numbers', () => {
      expect(capitalizeFirstLetter('123abc')).toBe('123abc');
    });

    test('should handle null/undefined values', () => {
      expect(capitalizeFirstLetter(null as any)).toBe('');
      expect(capitalizeFirstLetter(undefined as any)).toBe('');
    });
  });

  describe('formatArticleMetadata', () => {
    test('should format author and category with proper transliteration', () => {
      expect(formatArticleMetadata('Ibn Kathir', 'quran')).toBe('Ibn Kathīr · Qurʾān');
      expect(formatArticleMetadata('al-Imam Malik', 'fiqh')).toBe('Mālik · Fiqh');
    });

    test('should format author, category, and reading time', () => {
      expect(formatArticleMetadata('Ibn Kathir', 'quran', '4m')).toBe('Ibn Kathīr · Qurʾān · 4m');
    });

    test('should fall back to raw name for unknown authors', () => {
      expect(formatArticleMetadata('Unknown Author', 'unknown')).toBe('Unknown Author · Unknown');
    });

    test('should handle missing author or category', () => {
      expect(formatArticleMetadata('', 'quran')).toBe('quran');
      expect(formatArticleMetadata('Ibn Kathir', '')).toBe('Ibn Kathir');
      expect(formatArticleMetadata('', '')).toBe('');
    });

    test('should handle reading time with missing author/category', () => {
      expect(formatArticleMetadata('', 'quran', '3m')).toBe('quran');
      expect(formatArticleMetadata('Ibn Kathir', '', '3m')).toBe('Ibn Kathir');
    });

    test('should use middle dot separator consistently', () => {
      const result = formatArticleMetadata('an-Nawawi', 'seerah', '5m');
      expect(result).toContain('·');
      expect(result.split('·')).toHaveLength(3);
    });
  });

  describe('getCategoryDisplayName', () => {
    test('should return proper transliteration for known categories', () => {
      expect(getCategoryDisplayName('aqeedah')).toBe('ʿAqīdah');
      expect(getCategoryDisplayName('fiqh')).toBe('Fiqh');
      expect(getCategoryDisplayName('hadith')).toBe('Ḥadīth');
      expect(getCategoryDisplayName('ihsan')).toBe('Iḥsān');
      expect(getCategoryDisplayName('quran')).toBe('Qurʾān');
      expect(getCategoryDisplayName('seerah')).toBe('Sīrah');
    });

    test('should be case-insensitive', () => {
      expect(getCategoryDisplayName('HADITH')).toBe('Ḥadīth');
      expect(getCategoryDisplayName('Seerah')).toBe('Sīrah');
    });

    test('should fall back to capitalizing unknown categories', () => {
      expect(getCategoryDisplayName('unknown')).toBe('Unknown');
      expect(getCategoryDisplayName('history')).toBe('History');
    });
  });

  describe('getCategorySubtitle', () => {
    test('should return subtitle for known categories', () => {
      expect(getCategorySubtitle('aqeedah')).toBe('Islamic Creed');
      expect(getCategorySubtitle('fiqh')).toBe('Islamic Law');
      expect(getCategorySubtitle('hadith')).toBe('Prophetic Traditions');
      expect(getCategorySubtitle('ihsan')).toBe('Spiritual Excellence');
      expect(getCategorySubtitle('quran')).toBe('Quranic Studies');
      expect(getCategorySubtitle('seerah')).toBe('History & Biography');
    });

    test('should return undefined for unknown categories', () => {
      expect(getCategorySubtitle('unknown')).toBeUndefined();
    });
  });

  describe('getAuthorDisplayName', () => {
    test('should transliterate and drop al-Imam prefix for space', () => {
      expect(getAuthorDisplayName('al-Imam Malik')).toBe('Mālik');
      expect(getAuthorDisplayName('al-Imam ash-Shafii')).toBe('ash-Shāfiʿī');
      expect(getAuthorDisplayName('al-Imam al-Bukhari')).toBe('al-Bukhārī');
      expect(getAuthorDisplayName('al-Imam Muslim')).toBe('Muslim');
      expect(getAuthorDisplayName('al-Imam Ahmad ibn Hanbal')).toBe('Aḥmad ibn Ḥanbal');
      expect(getAuthorDisplayName('al-Imam at-Tirmidhi')).toBe('at-Tirmidhī');
      expect(getAuthorDisplayName('al-Imam as-Suyuti')).toBe('as-Suyūṭī');
    });

    test('should transliterate Ibn scholars', () => {
      expect(getAuthorDisplayName('Ibn Kathir')).toBe('Ibn Kathīr');
      expect(getAuthorDisplayName('Ibn Hajar al-Asqalani')).toBe('Ibn Ḥajar al-ʿAsqalānī');
      expect(getAuthorDisplayName('Ibn al-Jawzi')).toBe('Ibn al-Jawzī');
      expect(getAuthorDisplayName('Ibn Taymiyyah')).toBe('Ibn Taymiyyah');
    });

    test('should transliterate other scholars', () => {
      expect(getAuthorDisplayName('an-Nawawi')).toBe('an-Nawawī');
      expect(getAuthorDisplayName('at-Tabari')).toBe('aṭ-Ṭabarī');
      expect(getAuthorDisplayName('adh-Dhahabi')).toBe('adh-Dhahabī');
    });

    test('should fall back to raw name for unknown authors', () => {
      expect(getAuthorDisplayName('Unknown Author')).toBe('Unknown Author');
    });
  });
});
