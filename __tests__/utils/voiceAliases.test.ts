import {
  MAX_ALIASES_PER_ROOT,
  addAlias,
  collidesWithAnotherGloss,
  hasStorableText,
  isAliasStorable,
  normalizeAlias,
} from '@/utils/voiceAliases';

// Every transcript below is a real "Got it" from voice_grading_attempts. The
// three buckets they fall into are what the two rules exist to separate.
describe('voiceAliases', () => {
  describe('hasStorableText — the dead-mic bucket', () => {
    it('rejects an empty transcript', () => {
      // 43% of accepts. The mic returned nothing and the learner knew the word
      // anyway; there is no mishear to remember.
      expect(hasStorableText('')).toBe(false);
      expect(hasStorableText('   ')).toBe(false);
      expect(hasStorableText('...')).toBe(false);
    });

    it('accepts anything with real content, however far from the answer', () => {
      // No similarity floor: the learner said they knew it and we believe them.
      // The safety is in the payout (`vague`), not in second-guessing the tap.
      expect(hasStorableText('Linear.')).toBe(true);
      expect(hasStorableText('Oh no.')).toBe(true);
    });
  });

  describe('collidesWithAnotherGloss — the wrong-word bucket', () => {
    it('rejects a transcript that is another drilled word`s answer', () => {
      // Both real: the learner answered "beware" with the meaning of a root
      // they were drilling in the same session. Remembering it would let one
      // spoken word satisfy two different cards from then on.
      expect(collidesWithAnotherGloss('approach.', ['approach', 'grabbed'])).toBe(true);
      expect(collidesWithAnotherGloss('Beware.', ['beware', 'estimate'])).toBe(true);
    });

    it('sees through the scaffolding the recognizer adds', () => {
      // Parakeet supplies "to"/"the"/"a"; the gloss almost never does. Without
      // stripping it, "to approach" would slip past the guard.
      expect(collidesWithAnotherGloss('to approach', ['approach'])).toBe(true);
      expect(collidesWithAnotherGloss('the assembly', ['assembly'])).toBe(true);
    });

    it('lets a genuine mishear through', () => {
      expect(collidesWithAnotherGloss('Linear.', ['assembly', 'weigh'])).toBe(false);
      expect(collidesWithAnotherGloss('on her', ['lineage', 'violate'])).toBe(false);
    });

    it('is a no-op with nothing to collide against', () => {
      expect(collidesWithAnotherGloss('Linear.', [])).toBe(false);
    });
  });

  describe('isAliasStorable', () => {
    it.each([
      ['Linear.', 'lineage'],
      ['Wait.', 'weigh'],
      ['on her', 'honor'],
      ['violence.', 'violate'],
      ['hardgen.', 'hardship'],
      ['Easton.', 'eastern'],
    ])('remembers the real mishear "%s" (for "%s")', transcript => {
      expect(isAliasStorable({ transcript, otherGlosses: ['assembly', 'estimate'] })).toBe(true);
    });

    it.each([
      ['', 'dead mic'],
      ['approach.', 'another drilled word'],
    ])('refuses "%s" (%s)', transcript => {
      expect(isAliasStorable({ transcript, otherGlosses: ['approach', 'assembly'] })).toBe(false);
    });
  });

  describe('addAlias', () => {
    it('stores in the matcher`s normalized space', () => {
      expect(addAlias([], 'Linear.')).toEqual(['linear']);
      expect(normalizeAlias('Wait Too.')).toBe('wait too');
    });

    it('returns the same reference when nothing changed, so the reducer can skip', () => {
      const existing = ['linear'];
      expect(addAlias(existing, 'Linear.')).toBe(existing);
    });

    it('ignores an empty transcript', () => {
      const existing: string[] = [];
      expect(addAlias(existing, '  ')).toBe(existing);
    });

    it('caps per word, dropping the oldest', () => {
      let list: readonly string[] = [];
      for (let i = 0; i < MAX_ALIASES_PER_ROOT + 3; i++) list = addAlias(list, `heard ${i}`);
      expect(list).toHaveLength(MAX_ALIASES_PER_ROOT);
      expect(list[0]).toBe('heard 3');
      expect(list.at(-1)).toBe(`heard ${MAX_ALIASES_PER_ROOT + 2}`);
    });

    it('keeps several transcripts for one genuinely unstable word', () => {
      // "lineage" produced all three in a single session.
      let list: readonly string[] = [];
      for (const heard of ['Linear.', 'Linach.', 'Leaner edge.']) list = addAlias(list, heard);
      expect(list).toEqual(['linear', 'linach', 'leaner edge']);
    });
  });
});
