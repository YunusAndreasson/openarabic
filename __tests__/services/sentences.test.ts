/**
 * sentencesService.getExamplesForRoots Tests
 *
 * The review card's example sentence comes from here. It is shaping logic over
 * two queries, and the shape is what the card depends on:
 *
 * - the easiest usage of each root wins (the rows arrive difficulty-ordered)
 * - the whole sentence comes back, in reading order, so the card can grammar-
 *   colour every word rather than just the practised one
 * - the practised word is flagged from `root_id`, which is what lets the card
 *   mark it without matching the form against the sentence text
 *
 * Both queries go through `executeQuery`, so mocking that is enough — the
 * Supabase chain inside each thunk is never invoked.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/services/supabase', () => ({ supabase: { from: jest.fn() } }));

jest.mock('@/utils/supabaseHelpers', () => ({
  executeQuery: jest.fn(),
}));

import { sentencesService } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';
import { executeQuery } from '@/utils/supabaseHelpers';

const mockExecuteQuery = jest.mocked(executeQuery);

const roots = (...ids: number[]) => ids as unknown as RootId[];

/** Queue the two round trips in order: word rows, then sentence rows. */
function respondWith(wordRows: unknown, sentenceRows: unknown) {
  mockExecuteQuery.mockResolvedValueOnce(wordRows as never);
  mockExecuteQuery.mockResolvedValueOnce(sentenceRows as never);
}

const wordRow = (rootId: number, sentenceId: number, form: string, type = 'Noun') => ({
  root_id: rootId,
  sentence_id: sentenceId,
  word_form: form,
  difficulty_level: 1,
  word_type: { name: type },
});

describe('sentencesService.getExamplesForRoots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makes no request at all for an empty root list', async () => {
    const result = await sentencesService.getExamplesForRoots([]);

    expect(result.size).toBe(0);
    expect(mockExecuteQuery).not.toHaveBeenCalled();
  });

  test('returns the whole sentence in reading order, with the target flagged', async () => {
    respondWith(
      [wordRow(42, 7, 'الكتاب', 'Noun')],
      [
        {
          id: 7,
          arabic: 'قرأت الكتاب',
          english: 'I read the book',
          audio_url: 'sentences/7.mp3',
          arabic_repeat: false,
          english_repeat: false,
          audio_url_bilingual: '',
          audio_url_english: '',
          sentence_words: [
            // Deliberately out of order: PostgREST does not promise nested-row
            // ordering, and reading order is the whole point of this payload.
            { position: 2, word_form: 'الكتاب', english: 'the book', root_id: 42 },
            { position: 1, word_form: 'قرأت', english: 'I read', root_id: 9 },
          ],
        },
      ],
    );

    const example = (await sentencesService.getExamplesForRoots(roots(42))).get(42);

    expect(example?.words.map(w => w.position)).toEqual([1, 2]);
    expect(example?.words.map(w => w.wordForm)).toEqual(['قرأت', 'الكتاب']);
    expect(example?.words.map(w => w.isTarget)).toEqual([false, true]);
    expect(example?.wordType).toBe('Noun');
    expect(example?.audioUrl).toBe('sentences/7.mp3');
  });

  test('flags every occurrence of the practised root, and nothing else', async () => {
    respondWith(
      [wordRow(42, 7, 'الكتاب')],
      [
        {
          id: 7,
          arabic: 'الكتاب و الكتاب',
          english: 'the book and the book',
          audio_url: '',
          arabic_repeat: false,
          english_repeat: false,
          audio_url_bilingual: '',
          audio_url_english: '',
          sentence_words: [
            { position: 1, word_form: 'الكتاب', english: 'the book', root_id: 42 },
            { position: 2, word_form: 'و', english: 'and', root_id: 3 },
            // Same surface form, different root — a string match would have
            // marked this one too.
            { position: 3, word_form: 'الكتاب', english: 'the writing', root_id: 77 },
          ],
        },
      ],
    );

    const example = (await sentencesService.getExamplesForRoots(roots(42))).get(42);

    expect(example?.words.map(w => w.isTarget)).toEqual([true, false, false]);
  });

  test('keeps the easiest usage when a root appears in several sentences', async () => {
    respondWith(
      [
        // The query orders by difficulty_level, so the first row per root wins.
        wordRow(42, 7, 'الكتاب'),
        wordRow(42, 8, 'كتابها'),
      ],
      [
        {
          id: 7,
          arabic: 'الكتاب',
          english: 'the book',
          audio_url: '',
          arabic_repeat: false,
          english_repeat: false,
          audio_url_bilingual: '',
          audio_url_english: '',
          sentence_words: [{ position: 1, word_form: 'الكتاب', english: 'the book', root_id: 42 }],
        },
      ],
    );

    const example = (await sentencesService.getExamplesForRoots(roots(42))).get(42);

    expect(example?.sentenceId).toBe(7);
    expect(example?.wordForm).toBe('الكتاب');
  });

  test('omits a root whose sentence did not come back rather than failing', async () => {
    respondWith(
      [wordRow(42, 7, 'الكتاب'), wordRow(9, 99, 'قرأت', 'Verb')],
      [
        {
          id: 7,
          arabic: 'الكتاب',
          english: 'the book',
          audio_url: '',
          arabic_repeat: false,
          english_repeat: false,
          audio_url_bilingual: '',
          audio_url_english: '',
          sentence_words: [{ position: 1, word_form: 'الكتاب', english: 'the book', root_id: 42 }],
        },
      ],
    );

    const examples = await sentencesService.getExamplesForRoots(roots(42, 9));

    expect(examples.has(42)).toBe(true);
    expect(examples.has(9)).toBe(false);
  });

  test('returns nothing when no word rows match', async () => {
    mockExecuteQuery.mockResolvedValueOnce([] as never);

    const examples = await sentencesService.getExamplesForRoots(roots(42));

    expect(examples.size).toBe(0);
    // The second round trip is never made — there is nothing to look up.
    expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
  });
});
