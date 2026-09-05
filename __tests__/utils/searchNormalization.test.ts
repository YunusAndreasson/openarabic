/**
 * The folding that makes searching the texts work at all.
 *
 * Every string in the corpus carries marks nobody types — vocalised Arabic on
 * one side, scholarly transliteration on the other. These cases are the two
 * queries the feature exists to answer, plus the folds they depend on.
 */

import { describe, expect, test } from '@jest/globals';

import { normalizeForSearch, tokenizeSearchQuery } from '@/utils/searchNormalization';

describe('normalizeForSearch', () => {
  test('folds transliteration marks so a plain-ASCII query reaches a book title', () => {
    // The literal title of 30 texts in the library.
    expect(normalizeForSearch('Ṣayd al-Khāṭir')).toBe('sayd alkhatir');
    expect(normalizeForSearch('sayd al-khatir')).toBe('sayd alkhatir');
    expect(normalizeForSearch('al-Kalim al-Ṭayyib')).toBe('alkalim altayyib');
  });

  test('folds every transliteration letter the corpus actually contains', () => {
    // Enumerated from the database: these are the only marked Latin letters
    // in any title, summary, book, author or English sentence.
    expect(normalizeForSearch('ā Ā ḍ ḥ Ḥ ī ṣ Ṣ ṭ Ṭ ū ẓ')).toBe('a a d h h i s s t t u z');
  });

  test('drops the hamza and ayn marks, and the salutation ligature', () => {
    expect(normalizeForSearch('al-ʿilm')).toBe('alilm');
    expect(normalizeForSearch('Qurʾan')).toBe('quran');
    expect(normalizeForSearch('Muhammad ﷺ')).toBe('muhammad');
  });

  test('strips harakat so an undiacritized Arabic query reaches vocalised text', () => {
    expect(normalizeForSearch('التَّوْفِيق')).toBe('التوفيق');
    expect(normalizeForSearch('التوفيق')).toBe('التوفيق');
    expect(normalizeForSearch('مُحَمَّدٌ')).toBe('محمد');
  });

  test('strips tatweel, which is decoration rather than a letter', () => {
    expect(normalizeForSearch('محـــمد')).toBe('محمد');
  });

  test('folds alef variants together, including alef-with-hamza-above', () => {
    // The deliberate divergence from `normalizeArabic`, which preserves أ for
    // the grammar classifier. A search box wants أحمد and احمد to be one word.
    expect(normalizeForSearch('أحمد')).toBe(normalizeForSearch('احمد'));
    expect(normalizeForSearch('إِلَيْهِ')).toBe('اليه');
    expect(normalizeForSearch('آمن')).toBe('امن');
    expect(normalizeForSearch('ٱلْكِتَابُ')).toBe('الكتاب');
  });

  test('folds alef maqsura to yeh and ta marbuta to heh', () => {
    expect(normalizeForSearch('على')).toBe('علي');
    expect(normalizeForSearch('قلّة')).toBe('قله');
  });

  test('removes typographic punctuation the corpus is typeset with', () => {
    expect(normalizeForSearch('“Reason restrains…”')).toBe('reason restrains');
    expect(normalizeForSearch('one—two – three')).toBe('onetwo three');
    expect(normalizeForSearch('what’s that?')).toBe('whats that');
  });

  test('collapses whitespace and trims', () => {
    expect(normalizeForSearch('  the   sky  ')).toBe('the sky');
  });

  test('survives empty input', () => {
    expect(normalizeForSearch('')).toBe('');
  });
});

describe('tokenizeSearchQuery', () => {
  test('splits a folded query into words', () => {
    expect(tokenizeSearchQuery('Ṣayd al-Khāṭir')).toEqual(['sayd', 'alkhatir']);
  });

  test('a query of only punctuation or whitespace yields no tokens', () => {
    expect(tokenizeSearchQuery('   ')).toEqual([]);
    expect(tokenizeSearchQuery('!!!')).toEqual([]);
  });

  test('word order is not a filter — every token is tested independently', () => {
    const haystack = normalizeForSearch('Ṣayd al-Khāṭir');
    expect(tokenizeSearchQuery('khatir sayd').every(t => haystack.includes(t))).toBe(true);
  });
});
