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
      expect(editBudget('love')).toBe(1);
      expect(editBudget('mercy')).toBe(1);
      expect(editBudget('wisdom')).toBe(2);
      expect(editBudget('patience')).toBe(3);
      expect(editBudget('forgiveness')).toBe(3);
      expect(editBudget('unforgettable')).toBe(4);
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
  });

  describe('matchSingleWord — phonetic fold', () => {
    it('accepts a near-homophone mishear', () => {
      const r = matchSingleWord({ spoken: 'camperra', expected: 'canberra' });
      expect(r.matched).toBe(true);
      expect(['phonetic', 'edit']).toContain(r.method);
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
