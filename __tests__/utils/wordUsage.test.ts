/**
 * getWordUsage Tests
 *
 * Part of speech and the inflected forms both come out of the example sentences
 * the word screen has already loaded — `roots` holds neither, so the corpus is
 * the only source and this derivation is where they can go wrong.
 *
 * The rules being guarded:
 * - the class is the mode over occurrences OF THIS ROOT, other words ignored
 * - ties fall to the first-seen, which after the service's ranking is the
 *   easiest occurrence — the same row the review card's example picks, so the
 *   two screens can never call one word two different things
 * - the lemma is excluded from its own list of forms
 * - a form whose stored text carried punctuation renders cleaned and WITHOUT
 *   its colour segments, which were computed against the raw string
 */

import { describe, expect, test } from '@jest/globals';

import { getWordUsage } from '@/utils/wordUsage';
import type { SentenceWithWords } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';
import type { ColoredSegment, SentenceWord } from '@/types/vocabulary.types';

const TARGET = 7 as unknown as RootId;
const LEMMA = 'فَسَادٌ';

const segments: ColoredSegment[] = [{ text: 'و', color: '#fff', type: 'prefix' }];

function word(overrides: Partial<SentenceWord> & Pick<SentenceWord, 'word_form'>): SentenceWord {
  return {
    id: 1,
    position: 1,
    english: 'corruption',
    difficulty_level: 1,
    grammar_note: null,
    sentence_id: 100,
    word_type_id: 1,
    audio_url: null,
    root_id: TARGET,
    ...overrides,
  } as SentenceWord;
}

/** One sentence carrying the given words, with the rest of the row stubbed. */
function sentence(words: SentenceWord[], id = 1): SentenceWithWords {
  return { id, sentence_words: words, article: null } as unknown as SentenceWithWords;
}

describe('getWordUsage', () => {
  test('returns nothing at all without a root, rather than throwing', () => {
    expect(getWordUsage({ rootId: undefined, lemma: LEMMA, sentences: [] })).toEqual({
      partOfSpeech: null,
      forms: [],
    });
  });

  test('survives an empty example list', () => {
    expect(getWordUsage({ rootId: TARGET, lemma: LEMMA, sentences: [] })).toEqual({
      partOfSpeech: null,
      forms: [],
    });
  });

  test('takes the class from the mode over this root only', () => {
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [
        sentence([
          word({ word_form: 'فَسَادُ', word_type: { id: 1, name: 'Noun' } }),
          // A different root in the same sentence must not vote.
          word({
            word_form: 'قَالَ',
            root_id: 99 as unknown as RootId,
            word_type: { id: 2, name: 'Verb' },
          }),
        ]),
        sentence([word({ word_form: 'فَسَادِ', word_type: { id: 2, name: 'Verb' } })], 2),
        sentence([word({ word_form: 'وَفَسَادُ', word_type: { id: 1, name: 'Noun' } })], 3),
      ],
    });

    expect(usage.partOfSpeech).toBe('Noun');
  });

  test('breaks a tie on the first, i.e. easiest, occurrence', () => {
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [
        sentence([word({ word_form: 'فَسَادُ', word_type: { id: 2, name: 'Verb' } })]),
        sentence([word({ word_form: 'فَسَادِ', word_type: { id: 1, name: 'Noun' } })], 2),
      ],
    });

    expect(usage.partOfSpeech).toBe('Verb');
  });

  test('lists the inflected forms, deduped, in the order they were met', () => {
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [
        sentence([word({ word_form: 'وَفَسَادُ' }), word({ word_form: 'فَسَادِ' })]),
        sentence([word({ word_form: 'وَفَسَادُ' })], 2),
      ],
    });

    expect(usage.forms.map(f => f.form)).toEqual(['وَفَسَادُ', 'فَسَادِ']);
  });

  test('excludes the lemma — it is already the hero above', () => {
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [sentence([word({ word_form: LEMMA }), word({ word_form: 'فَسَادِ' })])],
    });

    expect(usage.forms.map(f => f.form)).toEqual(['فَسَادِ']);
  });

  test('keeps diacritic-only differences — that difference is the lesson', () => {
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [sentence([word({ word_form: 'فَسَادُ' }), word({ word_form: 'فَسَادِ' })])],
    });

    expect(usage.forms).toHaveLength(2);
  });

  test('caps the list rather than filling the screen with forms', () => {
    const many = ['ف١', 'ف٢', 'ف٣', 'ف٤', 'ف٥', 'ف٦', 'ف٧', 'ف٨'].map(form =>
      word({ word_form: form }),
    );

    const usage = getWordUsage({ rootId: TARGET, lemma: LEMMA, sentences: [sentence(many)] });

    expect(usage.forms).toHaveLength(6);
  });

  test('carries colour segments only while they still describe the string', () => {
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [
        sentence([
          word({ word_form: 'وَفَسَادُ', coloredSegments: segments }),
          // Cleaning strips the comma, so the segments no longer describe what
          // is about to be painted and must be dropped.
          word({ word_form: 'فَسَادِ،', coloredSegments: segments }),
        ]),
      ],
    });

    expect(usage.forms[0]).toEqual({ form: 'وَفَسَادُ', segments });
    expect(usage.forms[1]).toEqual({ form: 'فَسَادِ', segments: undefined });
  });

  test('capitalises the class — the overline type expects sentence case', () => {
    // `word_types.name` is stored lower case, and `overline` deliberately does
    // not upper-case, so the raw value rendered a lower-case "noun" under the
    // headword.
    const usage = getWordUsage({
      rootId: TARGET,
      lemma: LEMMA,
      sentences: [sentence([word({ word_form: 'فَسَادُ', word_type: { id: 1, name: 'noun' } })])],
    });

    expect(usage.partOfSpeech).toBe('Noun');
  });
});
