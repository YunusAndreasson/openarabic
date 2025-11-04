import {
  capitalizeFirstLetter,
  formatArticleMetadata,
  getFirstNameFromEmail,
} from '../../utils/stringUtils';

describe('stringUtils', () => {
  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('world')).toBe('World');
    });

    it('should handle single character strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
      expect(capitalizeFirstLetter('z')).toBe('Z');
    });

    it('should handle empty strings', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('should handle strings that are already capitalized', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    });

    it('should handle strings with numbers', () => {
      expect(capitalizeFirstLetter('123abc')).toBe('123abc');
    });

    it('should handle null/undefined values', () => {
      expect(capitalizeFirstLetter(null as any)).toBe('');
      expect(capitalizeFirstLetter(undefined as any)).toBe('');
    });
  });

  describe('getFirstNameFromEmail', () => {
    it('should extract first name from simple email', () => {
      expect(getFirstNameFromEmail('john@example.com')).toBe('John');
      expect(getFirstNameFromEmail('mary@example.com')).toBe('Mary');
    });

    it('should handle emails with dots', () => {
      expect(getFirstNameFromEmail('john.doe@example.com')).toBe('John');
      expect(getFirstNameFromEmail('mary.jane@example.com')).toBe('Mary');
    });

    it('should handle emails with underscores', () => {
      expect(getFirstNameFromEmail('john_doe@example.com')).toBe('John');
      expect(getFirstNameFromEmail('mary_jane@example.com')).toBe('Mary');
    });

    it('should handle emails with hyphens', () => {
      expect(getFirstNameFromEmail('john-doe@example.com')).toBe('John');
      expect(getFirstNameFromEmail('mary-jane@example.com')).toBe('Mary');
    });

    it('should handle emails with multiple separators', () => {
      expect(getFirstNameFromEmail('john.doe_smith@example.com')).toBe('John');
    });

    it('should return User for invalid emails', () => {
      expect(getFirstNameFromEmail('')).toBe('User');
      expect(getFirstNameFromEmail('@example.com')).toBe('User');
      expect(getFirstNameFromEmail(null as any)).toBe('User');
      expect(getFirstNameFromEmail(undefined as any)).toBe('User');
    });

    it('should extract from non-standard formats', () => {
      expect(getFirstNameFromEmail('example.com')).toBe('Example'); // No @, treats as localPart
    });

    it('should handle emails with numbers', () => {
      expect(getFirstNameFromEmail('john123@example.com')).toBe('John123');
    });
  });

  describe('formatArticleMetadata', () => {
    it('should format author and category without reading time', () => {
      expect(formatArticleMetadata('Ibn Kathir', 'tafsir')).toBe('Ibn Kathir · Tafsir');
      expect(formatArticleMetadata('Al-Ghazali', 'hadith')).toBe('Al-Ghazali · Hadith');
    });

    it('should format author, category, and reading time', () => {
      expect(formatArticleMetadata('Ibn Kathir', 'tafsir', '4m')).toBe('Ibn Kathir · Tafsir · 4m');
      expect(formatArticleMetadata('Al-Ghazali', 'hadith', '1m')).toBe('Al-Ghazali · Hadith · 1m');
      expect(formatArticleMetadata('Imam Nawawi', 'fiqh', '15m')).toBe('Imam Nawawi · Fiqh · 15m');
    });

    it('should capitalize category name', () => {
      expect(formatArticleMetadata('Author', 'category')).toBe('Author · Category');
      expect(formatArticleMetadata('Author', 'CATEGORY')).toBe('Author · CATEGORY'); // Only first letter capitalized
    });

    it('should handle missing author or category', () => {
      expect(formatArticleMetadata('', 'tafsir')).toBe('tafsir');
      expect(formatArticleMetadata('Ibn Kathir', '')).toBe('Ibn Kathir');
      expect(formatArticleMetadata('', '')).toBe('');
    });

    it('should handle reading time with missing author/category', () => {
      expect(formatArticleMetadata('', 'tafsir', '3m')).toBe('tafsir');
      expect(formatArticleMetadata('Ibn Kathir', '', '3m')).toBe('Ibn Kathir');
    });

    it('should use middle dot separator consistently', () => {
      const result = formatArticleMetadata('Author', 'category', '5m');
      expect(result).toContain('·');
      expect(result.split('·')).toHaveLength(3);
    });
  });
});
