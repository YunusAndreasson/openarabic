import {
  editBudget,
  levenshtein,
  matchSingleWord,
  normalize,
  phoneticFold,
} from '@/utils/voiceMatching';

describe('voiceMatching', () => {
  describe('normalize', () => {
    it('lowercases, strips punctuation, collapses whitespace', () => {
      expect(normalize('  Knowledge!  ')).toBe('knowledge');
      expect(normalize('Self-control.')).toBe('self control');
      expect(normalize('UPPER   case')).toBe('upper case');
    });

    it('is idempotent', () => {
      const once = normalize('Hello, World!');
      expect(normalize(once)).toBe(once);
    });
  });

  describe('levenshtein', () => {
    it('returns 0 for equal strings', () => {
      expect(levenshtein('knowledge', 'knowledge')).toBe(0);
    });

    it('counts edits', () => {
      expect(levenshtein('cat', 'cot')).toBe(1);
      expect(levenshtein('knowledge', 'knowledg')).toBe(1);
      expect(levenshtein('', 'abc')).toBe(3);
    });
  });

  describe('editBudget', () => {
    it('is strict for short words', () => {
      expect(editBudget('cat')).toBe(0);
      expect(editBudget('a')).toBe(0);
    });

    it('scales with length', () => {
      // Tightened 2026-07-25 (~length/5, was ~length/3) after field attempts
      // showed the looser budget crediting wrong answers into FSRS.
      expect(editBudget('love')).toBe(0);
      expect(editBudget('mercy')).toBe(0);
      expect(editBudget('wisdom')).toBe(1);
      expect(editBudget('patience')).toBe(1);
      expect(editBudget('knowledge')).toBe(2);
      expect(editBudget('forgiveness')).toBe(2);
      expect(editBudget('unforgettable')).toBe(3);
    });

    it('zero for words containing digits', () => {
      expect(editBudget('1942')).toBe(0);
      expect(editBudget('iso9000')).toBe(0);
    });
  });

  describe('phoneticFold', () => {
    it('collapses near-homophone consonants and double letters', () => {
      expect(phoneticFold('canberra')).toBe(phoneticFold('camperra'));
      // d↔t fold lines up "patience" with a t/d mishear.
      expect(phoneticFold('padience')).toBe(phoneticFold('patience'));
    });

    it('keeps distinct words distinct', () => {
      expect(phoneticFold('cat')).not.toBe(phoneticFold('cot'));
    });
  });

  describe('matchSingleWord — exact', () => {
    it('matches the same word', () => {
      const r = matchSingleWord({ spoken: 'knowledge', expected: 'knowledge' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('exact');
    });

    it('matches the word inside a longer utterance', () => {
      const r = matchSingleWord({ spoken: 'the answer is knowledge', expected: 'knowledge' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('exact');
    });

    it('ignores case and punctuation', () => {
      const r = matchSingleWord({ spoken: 'Mercy.', expected: 'mercy' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('exact');
    });
  });

  describe('matchSingleWord — edit budget', () => {
    it('accepts a single edit on a 9-char word', () => {
      const r = matchSingleWord({ spoken: 'knowledg', expected: 'knowledge' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('edit');
    });

    it('accepts within-budget splice on 11-char word', () => {
      const r = matchSingleWord({ spoken: 'forgivnes', expected: 'forgiveness' });
      expect(r.matched).toBe(true);
    });

    it('rejects a different short word (budget = 0)', () => {
      const r = matchSingleWord({ spoken: 'cot', expected: 'cat' });
      expect(r.matched).toBe(false);
      expect(r.method).toBe('miss');
    });

    // Regression: every one of these was accepted in the field and written to
    // FSRS as a correct answer. A false positive is the costly error here —
    // the learner never sees the word again — where a false negative just
    // shows them the transcript and an override button.
    it.each([
      ['just', 'jest'],
      ['rest', 'breast'],
      ['assented', 'ascended'],
      ['to be calm', 'to become'],
    ])('rejects the wrong word %s heard for %s', (spoken, expected) => {
      expect(matchSingleWord({ spoken, expected }).matched).toBe(false);
    });
  });

  describe('matchSingleWord — phonetic fold', () => {
    it('accepts a near-homophone mishear', () => {
      const r = matchSingleWord({ spoken: 'camperra', expected: 'canberra' });
      expect(r.matched).toBe(true);
      expect(['phonetic', 'edit']).toContain(r.method);
    });
  });

  describe('matchSingleWord — equivalence groups', () => {
    it('accepts a letter-name truncation (bee → b)', () => {
      const r = matchSingleWord({ spoken: 'b', expected: 'bee' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('equivalent');
      expect(r.similarity).toBe(1);
    });

    it('accepts a homophone both directions (sea ↔ see)', () => {
      expect(matchSingleWord({ spoken: 'sea', expected: 'see' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'see', expected: 'sea' }).matched).toBe(true);
    });

    it('accepts number word ↔ digit (two ↔ 2, three ↔ 3)', () => {
      expect(matchSingleWord({ spoken: 'to', expected: 'two' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'two', expected: '2' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: '3', expected: 'three' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'three', expected: '3' }).matched).toBe(true);
    });

    it('accepts a longer homophone the fold misses (flower ↔ flour)', () => {
      const r = matchSingleWord({ spoken: 'flour', expected: 'flower' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('equivalent');
    });

    it('finds the equivalent token inside a longer utterance', () => {
      const r = matchSingleWord({ spoken: 'i think it is b', expected: 'bee' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('equivalent');
    });

    it('does not collapse genuinely different short words', () => {
      expect(matchSingleWord({ spoken: 'cot', expected: 'cat' }).matched).toBe(false);
      expect(matchSingleWord({ spoken: 'pin', expected: 'pen' }).matched).toBe(false);
    });
  });

  describe('matchSingleWord — inflection leniency', () => {
    it('accepts a plural for a singular (books → book)', () => {
      const r = matchSingleWord({ spoken: 'books', expected: 'book' });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('inflection');
    });

    it('accepts -es / -ies plurals (buses → bus, flies → fly)', () => {
      expect(matchSingleWord({ spoken: 'buses', expected: 'bus' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'flies', expected: 'fly' }).matched).toBe(true);
    });

    it('accepts verb -ing / -ed forms (running → run, helped → help)', () => {
      expect(matchSingleWord({ spoken: 'running', expected: 'run' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'helped', expected: 'help' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'loving', expected: 'love' }).matched).toBe(true);
    });

    it('accepts adverb -ly forms (quickly → quick, happily → happy)', () => {
      expect(matchSingleWord({ spoken: 'quickly', expected: 'quick' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'happily', expected: 'happy' }).matched).toBe(true);
    });

    it('matches either direction (book ↔ books)', () => {
      expect(matchSingleWord({ spoken: 'book', expected: 'books' }).matched).toBe(true);
    });

    // The inflection layer must stay conservative: it must NOT be the thing that
    // collapses a root word onto a shorter one. (These pairs may still be
    // accepted by the separate, pre-existing fuzzy 0.70 fallback — that is
    // intended leniency and out of scope here.)
    it('does not stem a root word onto a shorter one (seed → see)', () => {
      expect(matchSingleWord({ spoken: 'seed', expected: 'see' }).method).not.toBe('inflection');
      expect(matchSingleWord({ spoken: 'feed', expected: 'fee' }).method).not.toBe('inflection');
    });

    it('does not strip agentive -er (teacher → teach)', () => {
      expect(matchSingleWord({ spoken: 'teacher', expected: 'teach' }).method).not.toBe(
        'inflection',
      );
    });
  });

  describe('matchSingleWord — British/American spelling', () => {
    it('accepts the alternate spelling either direction', () => {
      expect(matchSingleWord({ spoken: 'colour', expected: 'color' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'color', expected: 'colour' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'centre', expected: 'center' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'realise', expected: 'realize' }).matched).toBe(true);
    });
  });

  // 472 of 15,227 roots (3.1%) list alternatives with "/" or "," in `meaning`.
  // normalize() used to delete the separator and weld them into one word, so
  // those cards could never be graded: "return/end" became "returnend".
  describe('matchSingleWord — alternative glosses', () => {
    it('accepts either side of a slash gloss', () => {
      expect(matchSingleWord({ spoken: 'return', expected: 'return/end' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'end', expected: 'return/end' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'kill', expected: 'kill/annihilate' }).matched).toBe(true);
      expect(matchSingleWord({ spoken: 'annihilate', expected: 'kill/annihilate' }).matched).toBe(
        true,
      );
    });

    it('accepts any member of a comma gloss', () => {
      const expected = 'precious, noble, valuable';
      for (const spoken of ['precious', 'noble', 'valuable']) {
        expect(matchSingleWord({ spoken, expected }).matched).toBe(true);
      }
    });

    it('accepts a multi-word alternative', () => {
      expect(
        matchSingleWord({ spoken: 'be pleasant', expected: 'bless/be pleasant' }).matched,
      ).toBe(true);
    });

    it('still rejects a word that matches no alternative', () => {
      const r = matchSingleWord({ spoken: 'banana', expected: 'return/end' });
      expect(r.matched).toBe(false);
    });

    it('never produces the welded token', () => {
      expect(normalize('return/end')).toBe('return end');
      expect(matchSingleWord({ spoken: 'return', expected: 'return/end' }).normalizedExpected).toBe(
        'return',
      );
    });
  });

  describe('matchSingleWord — miss', () => {
    it('rejects an unrelated word', () => {
      const r = matchSingleWord({ spoken: 'apple', expected: 'knowledge' });
      expect(r.matched).toBe(false);
      expect(r.method).toBe('miss');
    });

    it('flags a known hallucination', () => {
      const r = matchSingleWord({ spoken: 'thank you', expected: 'mercy' });
      expect(r.matched).toBe(false);
      expect(r.method).toBe('hallucination');
    });

    it('flags empty transcript', () => {
      const r = matchSingleWord({ spoken: '   ', expected: 'mercy' });
      expect(r.matched).toBe(false);
      expect(r.method).toBe('miss');
    });
  });

  describe('matchSingleWord — despaced fallback', () => {
    it('accepts a word the ASR split with a space', () => {
      const r = matchSingleWord({ spoken: 'photo synthesis', expected: 'photosynthesis' });
      expect(r.matched).toBe(true);
    });
  });

  describe('matchSingleWord — fuzzy fallback', () => {
    it('accepts a two-letter swap on a multi-word phrase', () => {
      const r = matchSingleWord({ spoken: 'Humbel Himself', expected: 'humble himself' });
      expect(r.matched).toBe(true);
      expect(r.similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('accepts a dropped syllable above the similarity threshold', () => {
      const r = matchSingleWord({ spoken: 'isolat', expected: 'isolated' });
      expect(r.matched).toBe(true);
      expect(r.similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('still rejects an unrelated word below the threshold', () => {
      const r = matchSingleWord({ spoken: 'banana', expected: 'humble himself' });
      expect(r.matched).toBe(false);
      expect(r.similarity).toBeLessThan(0.7);
    });

    it('still rejects close-but-different short words (no fuzzy on digits, low sim)', () => {
      const r = matchSingleWord({ spoken: 'cot', expected: 'cat' });
      expect(r.matched).toBe(false);
    });
  });

  describe('matchSingleWord — similarity score is always populated', () => {
    it('exact match has similarity 1', () => {
      const r = matchSingleWord({ spoken: 'mercy', expected: 'mercy' });
      expect(r.similarity).toBe(1);
    });

    it('miss reports best similarity for debug HUD', () => {
      const r = matchSingleWord({ spoken: 'apple', expected: 'knowledge' });
      expect(r.matched).toBe(false);
      expect(r.similarity).toBeGreaterThanOrEqual(0);
      expect(r.similarity).toBeLessThan(0.7);
    });
  });
});
