import { capitalizeFirstLetter, getFirstNameFromEmail } from '../../utils/stringUtils';

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
});
