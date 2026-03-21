/**
 * Spot tests for English word translation expansion
 *
 * Verified against actual system behavior. These tests confirm that expanding
 * single-word translations to multi-word translations correctly activates
 * color-coding without breaking anything.
 *
 * KNOWN LIMITATIONS (documented, not bugs):
 * - اكتب → "I write": hamza-less ا can't be normalized to أ (would cause false positives
 *   on Form VII-X verbs like استطاع where ا is prosthetic, not a prefix)
 * - لا/لن → "do not"/"will not": pure particles with no root → skipped by design
 * - يتولد → "it arises": ي prefix fails when remaining starts with ت (Form V/VI ambiguity)
 * - الكتاب → "book": bracket injection is in computeColoredSegments(), not analyzeArabicWord()
 */

import { describe, expect, test } from '@jest/globals';

import { GrammaticalRole } from '@/constants/arabicWordComponents';
import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

function hasColoring(arabic: string, english: string) {
  return analyzeArabicWord(arabic, english).hasComponents;
}

const mockColors = {
  arabicText: '#000000',
  grammar: {
    preposition: '#A4C639',
    possessive: '#7EC9A3',
    particle: '#5CBDAB',
    interrogative: '#B5CC18',
    verbConjugation: '#6BB38A',
    negation: '#8CB854',
    subjectPrefix: '#4DC9B0',
    plural: '#A5BE6A',
    demonstrative: '#79C099',
    conjunction: '#64C4A6',
    futureTense: '#42CDBA',
    definiteArticle: '#DAC02A',
  },
} as never;

describe('Translation Expansion: Verified Patterns', () => {
  describe('Single-word translations must NOT color (gate check)', () => {
    test.each([
      ['يكتب', 'writes'],
      ['كتابه', 'book'],
      ['وقال', 'said'],
      ['فيه', 'in'],
      ['سيعلم', 'knows'],
      ['منه', 'from'],
      ['عليه', 'upon'],
      ['يرى', 'sees'],
      ['فرح', 'rejoiced'],
      ['الله', 'Allah'],
      ['هو', 'he'],
      ['هذه', 'this'],
      ['بيت', 'house'],
    ])('%s → "%s" must NOT color (single word)', (arabic, english) => {
      expect(hasColoring(arabic, english)).toBe(false);
    });
  });

  describe('Verb subject prefix (ي/ت/أ/ن) → "he/she/I/we + verb"', () => {
    test.each([
      ['يكتب', 'he writes', 'ي', GrammaticalRole.SUBJECT_PREFIX],
      ['يعلم', 'he knows', 'ي', GrammaticalRole.SUBJECT_PREFIX],
      ['يقول', 'he says', 'ي', GrammaticalRole.SUBJECT_PREFIX],
      ['تكتب', 'she writes', 'ت', GrammaticalRole.SUBJECT_PREFIX],
      ['تكتب', 'you write', 'ت', GrammaticalRole.SUBJECT_PREFIX],
      ['نكتب', 'we write', 'ن', GrammaticalRole.SUBJECT_PREFIX],
      ['أكتب', 'I write', 'أ', GrammaticalRole.SUBJECT_PREFIX],
    ])('%s → "%s" colors %s as %s', (arabic, english, expectedPrefix, expectedRole) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe(expectedPrefix);
      expect(a.prefixes[0]?.role).toBe(expectedRole);
    });

    test('KNOWN: اكتب (hamza-less) → "I write" does NOT color (أ preserved distinct from ا)', () => {
      // أ prefix can't be normalized to ا because it creates false positives
      // for Form VII-X verbs (استطاع, انكسر) where ا is prosthetic, not a prefix
      expect(hasColoring('اكتب', 'I write')).toBe(false);
    });
  });

  describe('2-char root verbs (assimilated verbs with dropped و)', () => {
    test.each([
      ['يجد', 'he finds', 'ي', GrammaticalRole.SUBJECT_PREFIX],
      ['يصل', 'he arrives', 'ي', GrammaticalRole.SUBJECT_PREFIX],
      ['تقع', 'it falls', 'ت', GrammaticalRole.SUBJECT_PREFIX],
      ['يضع', 'he puts', 'ي', GrammaticalRole.SUBJECT_PREFIX],
    ])('%s → "%s" colors %s (2-char root, 2 consonants)', (arabic, english, expectedPrefix, expectedRole) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe(expectedPrefix);
      expect(a.prefixes[0]?.role).toBe(expectedRole);
    });

    test('يرى → "he sees" DOES color (رى has 2 consonants: ى is alef maqsura, not weak ي)', () => {
      const a = analyzeArabicWord('يرى', 'he sees');
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe('ي');
      expect(a.prefixes[0]?.role).toBe(GrammaticalRole.SUBJECT_PREFIX);
    });
  });

  describe('Possessive suffix (ـه/ـها/ـهم/ـك/ـنا) → "his/her/their/your/our + noun"', () => {
    test.each([
      ['كتابه', 'his book', 'ه', GrammaticalRole.POSSESSIVE],
      ['كتابها', 'her book', 'ها', GrammaticalRole.POSSESSIVE],
      ['كتابهم', 'their book', 'هم', GrammaticalRole.POSSESSIVE],
      ['كتابك', 'your book', 'ك', GrammaticalRole.POSSESSIVE],
      ['كتابنا', 'our book', 'نا', GrammaticalRole.POSSESSIVE],
      ['نفسه', 'his self', 'ه', GrammaticalRole.POSSESSIVE],
      ['قلبه', 'his heart', 'ه', GrammaticalRole.POSSESSIVE],
      ['ربه', 'his Lord', 'ه', GrammaticalRole.POSSESSIVE],
    ])('%s → "%s" colors %s as %s', (arabic, english, expectedSuffix, expectedRole) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.suffix?.arabicMatch).toBe(expectedSuffix);
      expect(a.suffix?.role).toBe(expectedRole);
    });
  });

  describe('Conjunction prefix (و/ف) → "and/so + ..."', () => {
    test.each([
      ['وقال', 'and he said', 'و'],
      ['فقال', 'so he said', 'ف'],
      ['وكتب', 'and he wrote', 'و'],
    ])('%s → "%s" colors %s as conjunction', (arabic, english, expectedPrefix) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe(expectedPrefix);
      expect(a.prefixes[0]?.role).toBe(GrammaticalRole.CONJUNCTION);
    });
  });

  describe('Preposition + pronoun → "prep + pronoun"', () => {
    test.each([
      ['فيه', 'in it', 'في', 'ه'],
      ['منه', 'from him', 'من', 'ه'],
      ['عنه', 'about him', 'عن', 'ه'],
      ['عليه', 'upon him', 'علي', 'ه'],
      ['إليه', 'to him', 'إلي', 'ه'],
      ['له', 'for him', 'ل', 'ه'],
      ['به', 'with it', 'ب', 'ه'],
      ['لهم', 'for them', 'ل', 'هم'],
      ['فيها', 'in it', 'في', 'ها'],
      ['منها', 'from it', 'من', 'ها'],
    ])('%s → "%s" colors prefix %s and suffix %s', (arabic, english, expectedPrefix, expectedSuffix) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe(expectedPrefix);
      expect(a.suffix?.arabicMatch).toBe(expectedSuffix);
    });

    test('اليه (hamza-less) → "to him" DOES color (hamza normalization)', () => {
      const a = analyzeArabicWord('اليه', 'to him');
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe('إلي');
      expect(a.suffix?.arabicMatch).toBe('ه');
    });
  });

  describe('Future tense (س) → "will + verb"', () => {
    test.each([
      ['سيعلم', 'he will know'],
      ['سنرى', 'we will see'],
      ['سيكتب', 'he will write'],
    ])('%s → "%s" colors with future prefix', (arabic, english) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe('س');
      expect(a.prefixes[0]?.role).toBe(GrammaticalRole.FUTURE_TENSE);
    });
  });

  describe('Negation', () => {
    test('KNOWN: لا → "do not" does NOT color (pure particle, no root)', () => {
      expect(hasColoring('لا', 'do not')).toBe(false);
    });

    test('لايعلم → "he does not know" DOES color (has root)', () => {
      expect(hasColoring('لايعلم', 'he does not know')).toBe(true);
    });
  });

  describe('Combined patterns', () => {
    test('وكتابه → "and his book" colors conjunction + possessive', () => {
      const a = analyzeArabicWord('وكتابه', 'and his book');
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes[0]?.arabicMatch).toBe('و');
      expect(a.suffix?.arabicMatch).toBe('ه');
    });

    test('فبكتابهم → "so with their book" colors multi-prefix + possessive', () => {
      const a = analyzeArabicWord('فبكتابهم', 'so with their book');
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes.map(p => p.arabicMatch)).toEqual(expect.arrayContaining(['ف', 'ب']));
      expect(a.suffix?.arabicMatch).toBe('هم');
    });

    test('ويكتبه → "and he writes it" colors conjunction + subject + object', () => {
      const a = analyzeArabicWord('ويكتبه', 'and he writes it');
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes.map(p => p.arabicMatch)).toEqual(expect.arrayContaining(['و', 'ي']));
      expect(a.suffix?.arabicMatch).toBe('ه');
    });

    test('بالكتاب → "with the book" colors preposition + article', () => {
      const a = analyzeArabicWord('بالكتاب', 'with the book');
      expect(a.hasComponents).toBe(true);
      expect(a.prefixes.map(p => p.arabicMatch)).toEqual(expect.arrayContaining(['ب', 'ال']));
    });
  });

  describe('Verb conjugation suffixes', () => {
    test.each([
      ['كتبوا', 'they wrote', 'وا', GrammaticalRole.VERB_CONJUGATION],
      ['كتبت', 'I wrote', 'ت', GrammaticalRole.VERB_CONJUGATION],
      ['كتبتم', 'you all wrote', 'تم', GrammaticalRole.VERB_CONJUGATION],
    ])('%s → "%s" colors suffix %s', (arabic, english, expectedSuffix, expectedRole) => {
      const a = analyzeArabicWord(arabic, english);
      expect(a.hasComponents).toBe(true);
      expect(a.suffix?.arabicMatch).toBe(expectedSuffix);
      expect(a.suffix?.role).toBe(expectedRole);
    });
  });

  describe('Root-letter false positive prevention', () => {
    test.each([
      ['فرح', 'he rejoiced', 'ف is root letter'],
      ['وعد', 'he promised', 'و is root letter'],
      ['لعب', 'he played', 'ل is root letter'],
    ])('%s → "%s" does NOT color (%s)', (arabic, english) => {
      expect(hasColoring(arabic, english)).toBe(false);
    });
  });

  describe('Bracket injection (ال → [the]) via computeColoredSegments', () => {
    test('الكتاب → "book" gets bracket injection at segment level', () => {
      // analyzeArabicWord alone doesn't inject [the]
      expect(hasColoring('الكتاب', 'book')).toBe(false);

      // But computeColoredSegments does — this is the real app path
      const segments = computeColoredSegments('الكتاب', 'book', mockColors);
      expect(segments.length).toBe(2);
      expect(segments[0]?.text).toBe('ال');
      expect(segments[0]?.color).toBe('#DAC02A'); // definiteArticle golden
      expect(segments[1]?.text).toBe('كتاب');
    });

    test('الكتاب → "the book" colors at analysis level too', () => {
      expect(hasColoring('الكتاب', 'the book')).toBe(true);
    });
  });

  describe('Pronouns after conjunctions', () => {
    test.each([
      ['وهو', 'and he'],
      ['فهو', 'so he'],
      ['وهي', 'and she'],
    ])('%s → "%s" DOES color', (arabic, english) => {
      expect(hasColoring(arabic, english)).toBe(true);
    });
  });

  describe('Object pronouns on verbs', () => {
    test('علمني → "he taught me" colors ني as possessive', () => {
      const a = analyzeArabicWord('علمني', 'he taught me');
      expect(a.hasComponents).toBe(true);
      expect(a.suffix?.arabicMatch).toBe('ني');
    });
  });
});

describe('KNOWN LIMITATIONS (documented for guide accuracy)', () => {
  test('يتولد → "it arises": ي is now correctly detected as subject prefix (Form V verb)', () => {
    expect(hasColoring('يتولد', 'it arises')).toBe(true);
  });

  test('يرى → "he sees": now colors correctly (2-char root, 2 consonants with ى)', () => {
    expect(hasColoring('يرى', 'he sees')).toBe(true);
  });

  test('سيعلم: both س and ي detected as prefixes', () => {
    const a = analyzeArabicWord('سيعلم', 'he will know');
    expect(a.hasComponents).toBe(true);
    expect(a.prefixes.length).toBe(2);
    expect(a.prefixes[0]?.arabicMatch).toBe('س');
    expect(a.prefixes[1]?.arabicMatch).toBe('ي');
  });

  test('Standalone لا/لن skip coloring (pure particles, no root)', () => {
    expect(hasColoring('لا', 'do not')).toBe(false);
    expect(hasColoring('لن', 'will not')).toBe(false);
    expect(hasColoring('لايعلم', 'he does not know')).toBe(true);
  });
});
