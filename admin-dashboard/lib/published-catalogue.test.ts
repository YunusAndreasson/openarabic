import { describe, expect, it } from 'vitest';
import { countInWords, summariseCatalogue } from './published-catalogue';

describe('summariseCatalogue', () => {
  it('names only authors with texts, most texts first, and counts works and easier texts', () => {
    const summary = summariseCatalogue([
      { book: 'A', difficulty_level: 4, authors: { id: 1, name: 'Ibn al-Qayyim' } },
      { book: 'B', difficulty_level: 1, authors: { id: 2, name: 'Ibn al-Jawzi' } },
      { book: 'B', difficulty_level: 3, authors: { id: 2, name: 'Ibn al-Jawzi' } },
      { book: null, difficulty_level: null, authors: null },
    ]);

    expect(summary.authors.map((a) => [a.name, a.texts])).toEqual([
      ['Ibn al-Jawzi', 2],
      ['Ibn al-Qayyim', 1],
    ]);
    expect(summary.works).toBe(2);
    expect(summary.easierTexts).toBe(2);
  });

  it('breaks a tie by name so the order is stable', () => {
    const { authors } = summariseCatalogue([
      { book: 'A', difficulty_level: 4, authors: { id: 1, name: 'b' } },
      { book: 'A', difficulty_level: 4, authors: { id: 2, name: 'a' } },
    ]);
    expect(authors.map((a) => a.name)).toEqual(['a', 'b']);
  });
});

describe('countInWords', () => {
  it('spells small numbers and leaves larger ones', () => {
    expect(countInWords(6)).toBe('six');
    expect(countInWords(22)).toBe('22');
  });
});
