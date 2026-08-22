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

    // These four were accepted in the field and written to FSRS as fully
    // correct, which is what the 2026-07-25 tightening removed. The bar they
    // must clear is now "never `known`" rather than "never matched": each is
    // acoustically the answer, so the near path credits the long ones as
    // Guessed — a pass that SHORTENS the interval, so a wrongly-credited word
    // comes back rather than disappearing. That was the whole risk being
    // guarded against; the guard moved rather than went away.
    it.each([
      ['just', 'jest'], // 4 chars — under the near path's length floor
      ['to be calm', 'to become'],
      ['rest', 'breast'],
      ['assented', 'ascended'],
    ])('never awards full credit for %s heard as %s', (spoken, expected) => {
      expect(matchSingleWord({ spoken, expected }).credit).not.toBe('known');
    });

    it.each([
      ['just', 'jest'],
      ['cot', 'cat'],
    ])('leaves short words (%s / %s) an outright miss', (spoken, expected) => {
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

/**
 * Phonetic near-miss path. Every pair below is a real 2026-08-08 field attempt
 * from `voice_grading_attempts` where the learner said the answer and Parakeet
 * wrote down something else; all twelve were graded Forgot before this existed.
 */
describe('matchSingleWord — near path credits an utterance that SOUNDS right', () => {
  it.each([
    ['please', 'place'],
    ['price', 'praise'],
    ['girl with', 'girded with'],
    ['guard with', 'girded with'],
    ['girl it with', 'girded with'],
    ['to be aware', 'beware'],
    ['easton', 'eastern'],
    ['the recessions', 'his sessions'],
    ['and luisi', 'andalusian'],
    ['the travels', 'traveler'],
  ])('credits "%s" for "%s" as vague, not a miss', (spoken, expected) => {
    const r = matchSingleWord({ spoken, expected });
    expect(r.matched).toBe(true);
    expect(r.credit).toBe('vague');
  });

  it('never awards full credit on the near path — a wrong transcript is never mastery', () => {
    expect(matchSingleWord({ spoken: 'please', expected: 'place' }).credit).toBe('vague');
    expect(matchSingleWord({ spoken: 'place', expected: 'place' }).credit).toBe('known');
  });

  it.each([
    // The learner said a DIFFERENT word's meaning — these must stay misses.
    ['leading figure', 'girded with'],
    ['to arrive', 'grabbed'],
    ['to approach', 'beware'],
    ['establishment', 'expansive'],
    ['session', 'assembly'],
    ['to count', 'estimate'],
  ])('leaves "%s" for "%s" a miss', (spoken, expected) => {
    expect(matchSingleWord({ spoken, expected }).matched).toBe(false);
  });

  it('requires BOTH floors: phonetic alone would credit "send" for "ascended"', () => {
    // Key SNT sits inside ASNT (phonetic 0.75) but lexical similarity is 0.50.
    expect(matchSingleWord({ spoken: 'send', expected: 'ascended' }).matched).toBe(false);
  });
});

/**
 * `roots.meaning` is written as running English, so a gloss carries tense
 * markers and prepositions the learner never says: "were eager", "for close
 * ones", "girded with". Comparing the whole string against a bare one-word
 * utterance fails on scaffolding rather than on vocabulary.
 */
describe('matchSingleWord — head-word pass strips gloss scaffolding', () => {
  it.each([
    ['eager', 'were eager'],
    ['be eager', 'were eager'],
    ['the closed ones', 'for close ones'],
    ['to the close ones', 'for close ones'],
  ])('credits "%s" for "%s"', (spoken, expected) => {
    const r = matchSingleWord({ spoken, expected });
    expect(r.matched).toBe(true);
    expect(r.method).toBe('head');
  });

  it('gives full credit when the gloss reduces to one content word', () => {
    // "were eager" → "eager": the learner produced all of it.
    expect(matchSingleWord({ spoken: 'eager', expected: 'were eager' }).credit).toBe('known');
  });

  it('gives only vague credit when other content words survive', () => {
    // "become strong" keeps two content words, and the head "become" collides
    // with the separate card تَكُونُ "to become" — a partial answer, not mastery.
    const r = matchSingleWord({ spoken: 'become', expected: 'become strong' });
    expect(r.matched).toBe(true);
    expect(r.credit).toBe('vague');
  });

  it('never demotes an answer the full-string ladder already credits', () => {
    // Regression guard: with this pass above the ladder, "to become strong."
    // was intercepted and downgraded from edit/known to head/vague.
    expect(matchSingleWord({ spoken: 'to become strong', expected: 'become strong' }).credit).toBe(
      'known',
    );
    expect(matchSingleWord({ spoken: 'other than', expected: 'other than it' }).credit).toBe(
      'known',
    );
  });

  it('still misses when the head word is genuinely different', () => {
    expect(
      matchSingleWord({ spoken: 'to the first ones', expected: 'for close ones' }).matched,
    ).toBe(false);
  });
});

/**
 * The near path's lexical floor is measured against the WHOLE gloss, so a long
 * card answer drags it under 0.55 even when the learner clearly said the word.
 * A shared four-letter opening on the head content word substitutes for that
 * floor — the phonetic floor still has to clear on its own.
 */
describe('matchSingleWord — shared head prefix rescues a long gloss', () => {
  it('credits "girdle" for "girded with" as vague', () => {
    const r = matchSingleWord({ spoken: 'girdle', expected: 'girded with' });
    expect(r.matched).toBe(true);
    expect(r.credit).toBe('vague');
  });

  it.each([
    // Four letters, and only four. Every one of these opens with the same two
    // or three letters as its gloss and is a genuinely different answer — the
    // class the 2026-07-25 tightening exists to reject.
    ['assented', 'ascended'],
    ['astorium', 'assembly'],
    ['to eston', 'estimate'],
    ['learned', 'leading figure'],
    ['gradle with', 'grabbed'],
    ['establishment', 'expansive'],
  ])('does not let "%s" through for "%s" on prefix alone', (spoken, expected) => {
    const r = matchSingleWord({ spoken, expected });
    // Either a miss, or credited by the pre-existing near path — never `known`.
    expect(r.credit).not.toBe('known');
  });

  it('does not fire on a short head word, where a prefix is the whole word', () => {
    // "cat"/"cot" and "jest"/"just" must stay apart; a 4-letter prefix on a
    // 4-letter word would be an exact match by another name.
    expect(matchSingleWord({ spoken: 'just', expected: 'jest' }).matched).toBe(false);
    expect(matchSingleWord({ spoken: 'cot', expected: 'cat' }).matched).toBe(false);
  });

  // Both widenings run only after the card's own gloss has missed, and both pay
  // out at `vague` — see the MatchCredit doc. Every real pair below is from the
  // voice_grading_attempts table.
  describe('aliases — the learner`s own accept-list', () => {
    it('credits an exact repeat of a remembered mishear', () => {
      const r = matchSingleWord({
        spoken: 'Linear.',
        expected: 'lineage',
        aliases: ['linear'],
      });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('alias');
      expect(r.credit).toBe('vague');
    });

    it('never awards full credit, however sure the learner was', () => {
      // The card gloss is the only string that can earn `known`. An alias is
      // the learner vouching for a transcript, which is weaker evidence than
      // them producing the answer.
      expect(
        matchSingleWord({ spoken: 'on her', expected: 'honor', aliases: ['on her'] }).credit,
      ).toBe('vague');
    });

    it('will not reach an alias through raw edit distance', () => {
      // The boundary the old exact-only rule existed to hold, and it still
      // holds: fuzzing an alias compounds two approximations — transcript ≈
      // alias ≈ answer — and lets a word drift a step further from its gloss
      // with each accept. "Lineal." scores 0.83 edit distance against the
      // remembered "linear" and is still, correctly, a miss.
      const r = matchSingleWord({ spoken: 'Lineal.', expected: 'lineage', aliases: ['linear'] });
      expect(r.method).not.toBe('alias');
    });

    it('reaches an alias through a grammatical form of it', () => {
      // Why the rule moved off exact-only: the words that generate repeat
      // overrides are the ones the recognizer mangles DIFFERENTLY every time,
      // so an exact-keyed list never converges and the learner re-answers the
      // same card forever. `weighty` came back as "Wait.", "Waiting.", "Wade.",
      // "Lady" and "Oh, hey." across one week.
      const r = matchSingleWord({ spoken: 'Waiting.', expected: 'weighty', aliases: ['wait'] });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('alias');
      expect(r.credit).toBe('vague');
    });

    it('reaches an alias through its head content word', () => {
      const r = matchSingleWord({
        spoken: 'They feel as one.',
        expected: 'the filthy one',
        aliases: ['they feel the ones'],
      });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('alias');
    });

    it('reaches an alias through the tuned near tier', () => {
      const r = matchSingleWord({ spoken: 'on our', expected: 'honor', aliases: ['on her'] });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('alias');
    });

    it('never awards more than vague credit however it reached the alias', () => {
      // Every widened tier still routes through the same demotion: reaching a
      // remembered mishearing is weaker evidence than producing the answer.
      for (const spoken of ['Waiting.', 'on our']) {
        const expected = spoken === 'Waiting.' ? 'weighty' : 'honor';
        const aliases = spoken === 'Waiting.' ? ['wait'] : ['on her'];
        expect(matchSingleWord({ spoken, expected, aliases }).credit).toBe('vague');
      }
    });

    it('cannot rescue a hallucination or silence', () => {
      // A stock model phrase stored as an alias would credit every future
      // hallucination on that card, so those never reach the alias pass.
      expect(
        matchSingleWord({ spoken: 'thank you', expected: 'honor', aliases: ['thank you'] }).matched,
      ).toBe(false);
      expect(matchSingleWord({ spoken: '', expected: 'honor', aliases: [''] }).matched).toBe(false);
    });

    it('leaves a right answer at full credit rather than demoting it', () => {
      // The gloss ladder runs first, so an alias can only ever add.
      const r = matchSingleWord({ spoken: 'lineage', expected: 'lineage', aliases: ['linear'] });
      expect(r.credit).toBe('known');
      expect(r.method).toBe('exact');
    });
  });

  describe('corpus alternates — the same root, glossed elsewhere', () => {
    it('accepts another English name the corpus uses for the word', () => {
      // مَجْلِس is "assembly" on the card and "gathering" in the articles. A
      // learner who says the second one knows the word.
      const r = matchSingleWord({
        spoken: 'gathering',
        expected: 'assembly',
        alternates: ['gathering', 'the assembly'],
      });
      expect(r.matched).toBe(true);
      expect(r.method).toBe('corpus');
      expect(r.credit).toBe('vague');
    });

    it('strips the scaffolding the recognizer adds', () => {
      const r = matchSingleWord({
        spoken: 'a garden',
        expected: 'paradise',
        alternates: ['the garden'],
      });
      expect(r.matched).toBe(true);
      expect(r.credit).toBe('vague');
    });

    it('never awards full credit — a wrong corpus gloss must not bury a word', () => {
      // Root 10514 is "defame" and also carries "the cup" in sentence_words.
      // Nothing filters that out, so the payout is what keeps it survivable:
      // Rating.Hard shortens the interval instead of extending it.
      const r = matchSingleWord({
        spoken: 'the cup',
        expected: 'defame',
        alternates: ['the cup'],
      });
      expect(r.credit).not.toBe('known');
    });

    it('does not widen a genuinely wrong answer', () => {
      const r = matchSingleWord({
        spoken: 'Establishment',
        expected: 'expansive',
        alternates: ['the expanse', 'wide'],
      });
      expect(r.credit).not.toBe('known');
    });

    it('is inert when the word has no corpus glosses', () => {
      const r = matchSingleWord({ spoken: 'mercy', expected: 'mercy', alternates: [] });
      expect(r.credit).toBe('known');
    });
  });
});
