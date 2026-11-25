import { describe, expect, test } from '@jest/globals';

import {
  arabicHeadwordPattern,
  dictionarySearchTerm,
  rankDictionaryEntries,
} from '@/utils/dictionarySearch';

describe('public dictionary search', () => {
  test('accepts Arabic and English and ignores blank and single-letter queries', () => {
    expect(dictionarySearchTerm('  BOOK ')).toBe('book');
    expect(dictionarySearchTerm('كِتَابٌ')).toBe('كتاب');
    expect(dictionarySearchTerm('؟ـ')).toBe('');
    expect(dictionarySearchTerm('بِ')).toBe('');
  });

  test('finds vocalized Arabic variants by actual letters and rejects regex syntax', () => {
    const pattern = new RegExp(arabicHeadwordPattern(dictionarySearchTerm('ايمان')) ?? '(?!)');
    expect(pattern.test('إِيمَانٌ')).toBe(true);
    expect(pattern.test('أَيْمَانٌ')).toBe(true);
    expect(pattern.test('إِيمَارٌ')).toBe(false);
    expect(arabicHeadwordPattern('.*')).toBeUndefined();
    expect(arabicHeadwordPattern('book')).toBeUndefined();
  });

  test('puts exact and prefix entries before substring matches without dropping different roots', () => {
    const entries = [
      { id: 1, letters: 'مَكْتَبَة', meaning: 'library' },
      { id: 2, letters: 'كُتُب', meaning: 'books' },
      { id: 3, letters: 'كِتَابٌ', meaning: 'Book' },
      { id: 4, letters: 'سِفْرٌ', meaning: 'book' },
    ];
    expect(rankDictionaryEntries(entries, 'book').map(entry => entry.id)).toEqual([3, 4, 2, 1]);
  });
});
