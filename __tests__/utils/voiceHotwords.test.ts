import { countHotwords, mergeHotwords, parakeetBpeVocab } from '@/utils/voiceHotwords';

/** A first session's vocabulary: nothing before it. */
const vocabularyOf = (glosses: readonly string[]): string => mergeHotwords('', glosses);

describe('mergeHotwords', () => {
  it('lists every alternative of every gloss, lowercase and sorted', () => {
    expect(vocabularyOf(['Return/end', 'girded with', 'Book'])).toBe(
      'book\nend\ngirded with\nreturn\n',
    );
  });

  it('is the same string whatever order the session is in', () => {
    expect(vocabularyOf(['book', 'house'])).toBe(vocabularyOf(['house', 'book']));
  });

  it('never biases toward a single answer', () => {
    expect(vocabularyOf(['book'])).toBe('');
    expect(vocabularyOf(['Book', 'book'])).toBe('');
  });

  it('drops what is not an answer the model can spell', () => {
    // A parenthetical is not split into its own hotwords, a gloss with a digit
    // goes whole, and a definition is too long to be something a learner says.
    expect(
      vocabularyOf(['(he, she) said', '3 times', 'the one who is very far away indeed', 'pen']),
    ).toBe('pen\nsaid\n');
  });

  it('leaves an oversized session unbiased', () => {
    const glosses = Array.from({ length: 300 }, (_, i) => `word ${'a'.repeat(i + 1)}`);
    expect(vocabularyOf(glosses)).toBe('');
  });

  it('returns the very same vocabulary when a session brings nothing new', () => {
    const session = vocabularyOf(['book', 'house', 'pen']);
    expect(mergeHotwords(session, ['pen', 'book'])).toBe(session);
    expect(mergeHotwords(session, [])).toBe(session);
  });

  it('adds new answers to the ones already there', () => {
    expect(mergeHotwords(vocabularyOf(['book', 'house']), ['river'])).toBe('book\nhouse\nriver\n');
  });

  it('starts over from the new session once the union passes the cap', () => {
    const first = Array.from({ length: 200 }, (_, i) => `first ${'a'.repeat(i + 1)}`);
    const second = Array.from({ length: 100 }, (_, i) => `second ${'a'.repeat(i + 1)}`);
    expect(mergeHotwords(vocabularyOf(first), second)).toBe(vocabularyOf(second));
  });
});

describe('mergeHotwords past the cap', () => {
  it('keeps the vocabulary it has when a session is too large to bias toward', () => {
    const current = ['book', 'house', 'pen'].sort().join('\n') + '\n';
    const backlog = Array.from({ length: 300 }, (_, i) => `word ${'a'.repeat(i + 1)}`);
    expect(mergeHotwords(current, backlog)).toBe(current);
    expect(mergeHotwords('', backlog)).toBe('');
  });
});

describe('countHotwords', () => {
  it('counts phrases, not lines', () => {
    expect(countHotwords('')).toBe(0);
    expect(countHotwords('book\ngirded with\n')).toBe(2);
  });
});

describe('parakeetBpeVocab', () => {
  it('keeps token spelling and order and gives every token the same score', () => {
    expect(parakeetBpeVocab('<blk> 0\n\u2581the 1\ns 2\n')).toBe(
      '<blk>\t-1.0\n\u2581the\t-1.0\ns\t-1.0\n',
    );
  });

  it('refuses a file that is not a token table', () => {
    expect(() => parakeetBpeVocab('')).toThrow('empty');
    expect(() => parakeetBpeVocab('the\n')).toThrow('Invalid');
  });
});
