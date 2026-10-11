/**
 * Single-word English answer matching for the Practice "speak the answer" flow.
 *
 * The cards in this app are guaranteed to have a single-word English meaning, so
 * we deliberately port only the short-answer path from edemind's voice grader:
 * normalize → exact match → curated equivalence → length-scaled Levenshtein →
 * phonetic fold → fuzzy ratio. No embeddings, no cosine similarity. Pure code,
 * no React, no native deps — unit-testable in isolation.
 *
 * The equivalence layer is what lets a learner who clearly said the right word
 * off the hook when the ASR picks a homophone: "bee"→"b", "three"→"3",
 * "flour"/"flower". It is a finite, curated set rather than a phonetic algorithm
 * precisely so it never collapses two genuinely different short words (cat/cot).
 */

/** Lowercase, strip punctuation, collapse whitespace. Idempotent. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-–—/,]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split a dictionary gloss into the separate answers it actually offers.
 *
 * `roots.meaning` uses `/` and `,` to list alternatives — "return/end",
 * "kill/annihilate", "precious, noble, valuable" — and 472 of the 15,227 roots
 * (3.1%) are written this way. Before this existed, normalize() deleted the
 * separator and welded the alternatives into one token ("return/end" →
 * "returnend"), so those cards could never be graded by voice: the learner says
 * one valid alternative and the expected string is a word that does not exist.
 * Saying ANY listed alternative is full credit.
 */
export function expectedAlternatives(expected: string): string[] {
  const parts = expected
    .split(/[/,]/)
    .map(part => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [expected];
}

/** Levenshtein edit distance — small, for fuzzy single-token matching. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? Number.POSITIVE_INFINITY) + 1,
        (curr[j - 1] ?? Number.POSITIVE_INFINITY) + 1,
        (prev[j - 1] ?? Number.POSITIVE_INFINITY) + cost,
      );
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

/**
 * Edit tolerance scaled to word length (~length/5): a clearly-intended answer
 * with one mispronounced consonant should still pass on a self-graded recall
 * app. Words <6 chars get none (cat/cot, jest/just are different words), digits
 * get none.
 *
 * Tightened 2026-07-25 from ~length/3 after reading real grading attempts: of
 * the seven `edit` matches in the field, five had credited a genuinely WRONG
 * answer — jest→"just", breast→"rest", ascended→"assented",
 * "to become"→"to be calm" — which is the costlier error here. A false negative
 * shows the learner a transcript and an override button; a false positive
 * silently writes "known" into FSRS and the word never comes back.
 */
export function editBudget(word: string): number {
  if (/\d/.test(word)) return 0;
  if (word.length >= 12) return 3;
  if (word.length >= 9) return 2;
  if (word.length >= 6) return 1;
  return 0;
}

/**
 * Collapse acoustically-confusable consonants so a near-homophone ASR mishear
 * lines up: nasals n/m, stops b/p · d/t · c/g/k/q, sibilants s/z, labials v/w/f.
 * Repeated folded letters collapse. Vowels and l/r intentionally untouched.
 */
export function phoneticFold(word: string): string {
  return word
    .replace(/[mn]/g, 'n')
    .replace(/[bp]/g, 'b')
    .replace(/[dt]/g, 'd')
    .replace(/[ckgq]/g, 'k')
    .replace(/[sz]/g, 's')
    .replace(/[fvw]/g, 'v')
    .replace(/(.)\1+/g, '$1');
}

/**
 * Min length for phonetic-fold matching — shorter words collide once folded.
 * Raised 6 → 8: the fold maps m/n, b/p, d/t, c/g/k/q, s/z, f/v/w onto each
 * other and collapses doubles, so on a 6-char word it merges genuinely
 * different vocabulary. Long words retain enough distinct material to survive
 * it (canberra/camperra still folds equal).
 */
const PHONETIC_MIN_LEN = 8;

function foldsEqual(a: string, b: string): boolean {
  if (b.length < PHONETIC_MIN_LEN || /\d/.test(a) || /\d/.test(b)) return false;
  return phoneticFold(a) === phoneticFold(b);
}

/**
 * Curated equivalence classes for the short-word mishears the edit-budget and
 * phonetic-fold paths can't safely accept. Each inner array is one class; any
 * two members count as the same answer. Covers the three ASR patterns a learner
 * hits when they actually said the right single word:
 *   • letter-name truncation — Parakeet hears "bee" as "b", "sea" as "c";
 *   • number word ↔ digit — "three" vs "3", "two" vs "2";
 *   • classic English homophones — "flour"/"flower", "write"/"right".
 * Finite and deterministic by design: unlike a phonetic algorithm it never
 * collapses two genuinely different short words (cat/cot, pin/pen stay apart).
 * Tokens must be normalize()-form (lowercase, no punctuation) and belong to at
 * most one class.
 */
const EQUIVALENCE_GROUPS: readonly (readonly string[])[] = [
  // Letter names ↔ homophone words.
  ['b', 'be', 'bee'],
  ['c', 'see', 'sea'],
  ['d', 'dee'],
  ['g', 'gee'],
  ['i', 'eye', 'aye'],
  ['j', 'jay'],
  ['k', 'kay'],
  ['o', 'oh', 'owe'],
  ['p', 'pea', 'pee'],
  ['q', 'cue', 'queue'],
  ['r', 'are', 'ar'],
  ['t', 'tea', 'tee'],
  ['u', 'you', 'ewe', 'yew'],
  ['x', 'ex'],
  ['y', 'why', 'wye'],
  ['z', 'zee', 'zed'],
  // Number words ↔ digits.
  ['0', 'zero'],
  ['1', 'one', 'won'],
  ['2', 'two', 'to', 'too'],
  ['3', 'three'],
  ['4', 'four', 'for', 'fore'],
  ['5', 'five'],
  ['6', 'six'],
  ['7', 'seven'],
  ['8', 'eight', 'ate'],
  ['9', 'nine'],
  ['10', 'ten'],
  ['11', 'eleven'],
  ['12', 'twelve'],
  ['20', 'twenty'],
  ['100', 'hundred'],
  ['1000', 'thousand'],
  // Classic English homophones the fold / edit budget misses.
  ['their', 'there', 'theyre'],
  ['your', 'youre'],
  ['here', 'hear'],
  ['by', 'buy'],
  ['no', 'know'],
  ['new', 'knew'],
  ['hour', 'our'],
  ['son', 'sun'],
  ['wood', 'would'],
  ['flower', 'flour'],
  ['write', 'right', 'rite', 'wright'],
  ['knight', 'night'],
  ['principal', 'principle'],
  ['peace', 'piece'],
  ['plain', 'plane'],
  ['week', 'weak'],
  ['meet', 'meat'],
  ['sale', 'sail'],
  ['tail', 'tale'],
  ['break', 'brake'],
  ['hole', 'whole'],
  ['made', 'maid'],
  ['pair', 'pear'],
  ['bare', 'bear'],
  ['cell', 'sell'],
  ['heal', 'heel'],
  ['nose', 'knows'],
  ['scene', 'seen'],
  ['steal', 'steel'],
  ['wait', 'weight'],
  ['waist', 'waste'],
  ['wear', 'where'],
  ['which', 'witch'],
  // British ↔ American spelling. Parakeet is US-trained but card answers may use
  // either spelling, so the other variant is full credit.
  ['color', 'colour'],
  ['honor', 'honour'],
  ['favor', 'favour'],
  ['flavor', 'flavour'],
  ['behavior', 'behaviour'],
  ['neighbor', 'neighbour'],
  ['labor', 'labour'],
  ['harbor', 'harbour'],
  ['rumor', 'rumour'],
  ['humor', 'humour'],
  ['vapor', 'vapour'],
  ['odor', 'odour'],
  ['valor', 'valour'],
  ['vigor', 'vigour'],
  ['savor', 'savour'],
  ['glamor', 'glamour'],
  ['armor', 'armour'],
  ['parlor', 'parlour'],
  ['tumor', 'tumour'],
  ['center', 'centre'],
  ['meter', 'metre'],
  ['liter', 'litre'],
  ['theater', 'theatre'],
  ['fiber', 'fibre'],
  ['somber', 'sombre'],
  ['realize', 'realise'],
  ['organize', 'organise'],
  ['recognize', 'recognise'],
  ['apologize', 'apologise'],
  ['analyze', 'analyse'],
  ['paralyze', 'paralyse'],
  ['memorize', 'memorise'],
  ['emphasize', 'emphasise'],
  ['criticize', 'criticise'],
  ['summarize', 'summarise'],
  ['catalog', 'catalogue'],
  ['dialog', 'dialogue'],
  ['analog', 'analogue'],
  ['gray', 'grey'],
  ['mold', 'mould'],
  ['plow', 'plough'],
  ['tire', 'tyre'],
  ['curb', 'kerb'],
  ['pajamas', 'pyjamas'],
  ['aluminum', 'aluminium'],
  ['defense', 'defence'],
  ['offense', 'offence'],
  ['practice', 'practise'],
  ['license', 'licence'],
  ['mustache', 'moustache'],
  ['donut', 'doughnut'],
  ['jewelry', 'jewellery'],
  ['judgment', 'judgement'],
];

/** token → index of its equivalence class, built once at module load. */
const EQUIVALENCE_INDEX: Map<string, number> = (() => {
  const map = new Map<string, number>();
  EQUIVALENCE_GROUPS.forEach((group, i) => {
    for (const token of group) map.set(token, i);
  });
  return map;
})();

/** True when both tokens fall in the same curated equivalence class. */
function equivalentTokens(a: string, b: string): boolean {
  const groupA = EQUIVALENCE_INDEX.get(a);
  if (groupA === undefined) return false;
  return groupA === EQUIVALENCE_INDEX.get(b);
}

/** Plural / 3rd-person stems may shrink to 3 chars (cats→cat, box→box). */
const MIN_STEM_LEN = 3;
/**
 * Verb / adverb stems must stay ≥4 chars. This is the guard that stops real
 * root words from collapsing onto a shorter unrelated word: "seed"/"feed"/
 * "breed" would otherwise stem to "see"/"fee"/"bree".
 */
const MIN_VERB_STEM_LEN = 4;

/** running→runn→run, stopped→stopp→stop: drop a final doubled consonant. */
function dedouble(stem: string): string {
  return /([^aeiou])\1$/.test(stem) ? stem.slice(0, -1) : stem;
}

/**
 * Conservative inflection stripper. Returns the word plus the base forms it
 * could be an inflection of, so a learner who says a different grammatical form
 * of the right word still passes: "books"→"book", "running"→"run",
 * "helped"→"help", "quickly"→"quick". Two words are inflection-equivalent when
 * their variant sets intersect.
 *
 * Tuned for precision on a grading gate: plurals collapse to a 3-char base,
 * verbs/adverbs to a 4-char base, and agentive/comparative -er/-est are
 * deliberately never stripped (so "teacher" never matches "teach").
 */
function inflectionVariants(word: string): string[] {
  if (word.length < 4 || /\d/.test(word)) return [word];
  const out = new Set<string>([word]);
  const add = (s: string, min: number): void => {
    if (s.length >= min) out.add(s);
  };

  // Plurals / 3rd-person singular.
  if (word.endsWith('ies')) {
    add(word.slice(0, -3) + 'y', MIN_STEM_LEN); // flies→fly, studies→study
    add(word.slice(0, -1), MIN_STEM_LEN); // ties→tie, pies→pie
  } else if (/(ses|xes|zes|ches|shes)$/.test(word)) {
    add(word.slice(0, -2), MIN_STEM_LEN); // buses→bus, boxes→box, wishes→wish
  } else if (word.endsWith('es')) {
    add(word.slice(0, -1), MIN_STEM_LEN); // names→name, houses→house
    add(word.slice(0, -2), MIN_STEM_LEN); // bare stem fallback
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    add(word.slice(0, -1), MIN_STEM_LEN); // books→book, runs→run
  }

  // Verb -ing / -ed. The bare base and the silent-e reconstruction stay ≥4 so
  // root nouns like seed/feed/breed don't collapse onto see/fee/bree. The
  // de-doubled base is allowed down to 3 chars but only when it actually removed
  // a doubled consonant (running→run, sitting→sit) — a CVC-doubling signal that
  // seed/feed never trip.
  const addDedoubled = (base: string): void => {
    const dd = dedouble(base);
    if (dd !== base) add(dd, MIN_STEM_LEN);
  };
  if (word.endsWith('ing')) {
    const base = word.slice(0, -3);
    add(base, MIN_VERB_STEM_LEN); // playing→play
    addDedoubled(base); // running→run
    add(base + 'e', MIN_VERB_STEM_LEN); // making→make, loving→love
  } else if (word.endsWith('ed')) {
    const base = word.slice(0, -2);
    add(base, MIN_VERB_STEM_LEN); // helped→help
    addDedoubled(base); // stopped→stop
    add(base + 'e', MIN_VERB_STEM_LEN); // loved→love, hoped→hope
  }

  // Adverbs.
  if (word.endsWith('ily')) {
    add(word.slice(0, -3) + 'y', MIN_VERB_STEM_LEN); // happily→happy, easily→easy
  } else if (word.endsWith('ly')) {
    add(word.slice(0, -2), MIN_VERB_STEM_LEN); // quickly→quick, slowly→slow
  }

  return [...out];
}

/** True when `token` is an inflected form sharing a base with the expected word. */
function inflectionMatch(expectedVariants: ReadonlySet<string>, token: string): boolean {
  for (const variant of inflectionVariants(token)) {
    if (expectedVariants.has(variant)) return true;
  }
  return false;
}

/**
 * Grammatical scaffolding that carries no lexical content. Stripping it is what
 * lets "were eager" and "Eager." meet: `roots.meaning` is written as a gloss in
 * running English, so the card string carries a tense marker or a preposition
 * the learner never says out loud.
 *
 * Deliberately wider than `LEADING_FUNCTION_WORDS` (which only strips a leading
 * to/the/a/an) because the scaffolding here is not always leading — it is the
 * `were` in "were eager", the `with` in "girded with", the `for`/`ones` in "for
 * close ones". Every member is a closed-class word that cannot be the answer on
 * its own, EXCEPT via the guard in `contentWords`: a gloss made entirely of
 * these ("one", "be") keeps its tokens rather than reducing to nothing.
 */
const FUNCTION_WORDS = new Set([
  'a',
  'an',
  'and',
  'be',
  'been',
  'for',
  'her',
  'his',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'one',
  'ones',
  'the',
  'their',
  'to',
  'was',
  'were',
  'with',
]);

/**
 * The lexically meaningful tokens of a normalized string. Falls back to the raw
 * tokens when everything would be stripped, so a card whose whole gloss is a
 * function word ("one", "be") still has something to compare.
 */
function contentWords(normalized: string): string[] {
  const tokens = normalized.split(' ').filter(Boolean);
  const content = tokens.filter(token => !FUNCTION_WORDS.has(token));
  return content.length > 0 ? content : tokens;
}

/**
 * Parakeet very rarely emits these on near-silence (more of a Whisper habit),
 * but the guard is cheap and protects against the edge case where the energy
 * gate's heardSpeech flag is true for a brief ambient noise.
 */
const ASR_HALLUCINATIONS = new Set([
  'thank you',
  'thanks',
  'thank you so much',
  'thank you very much',
  'thanks for watching',
  'thank you for watching',
  'you',
  'bye',
  'bye bye',
  'subscribe',
  'please subscribe',
]);

/**
 * Which button the result panel should emphasise after a miss. `null` means
 * genuinely ambiguous — let the learner judge. Named because the review hook
 * and the telemetry row each spelled the same three-way union out by hand.
 */
export type VoiceSuggestion = 'unknown' | 'retry' | null;

export type MatchMethod =
  | 'exact'
  | 'equivalent'
  | 'inflection'
  | 'edit'
  | 'phonetic'
  | 'fuzzy'
  /** Matched the gloss's head content word once scaffolding was stripped. */
  | 'head'
  | 'near'
  /** Matched a transcript the learner personally accepted for this word. */
  | 'alias'
  /** Matched how the corpus glosses this root elsewhere, not the card's gloss. */
  | 'corpus'
  | 'hallucination'
  | 'miss';

/**
 * How much credit a match is worth. Every exact/equivalent/inflection/edit/
 * fuzzy path is `known` — the learner demonstrably produced the answer. The
 * `near` path is `vague`: the utterance is acoustically the answer but the
 * transcript isn't, so we credit it rather than fail the learner, at the lower
 * confidence tier. See NEAR_MIN_PHONETIC for why that tier is the whole trick.
 *
 * `alias` and `corpus` are `vague` for the same reason from the other side:
 * there the transcript is taken at face value but the EXPECTED string is not
 * the card's gloss, so what was matched is only probably the right answer.
 * Everything we are less than certain about pays out at Rating.Hard, which
 * passes the card while pulling it back sooner.
 */
export type MatchCredit = 'known' | 'vague' | 'unknown';

/**
 * Grammatical scaffolding Parakeet adds to a one-word answer. The model is
 * trained on running speech, so a bare gloss comes back as "to count", "the
 * travels", "a garden" — 56 of 142 field misses started with one of these and
 * the dictionary gloss almost never does (3 of 142).
 */
const LEADING_FUNCTION_WORDS = /^(?:to|the|a|an)\s+/;

export function stripLeadingFunctionWords(text: string): string {
  let out = text;
  let previous: string;
  do {
    previous = out;
    out = out.replace(LEADING_FUNCTION_WORDS, '').trim();
  } while (out !== previous);
  return out;
}

/**
 * Approximate English pronunciation as a consonant skeleton — a compact
 * Metaphone. This exists because `phoneticFold` folds ORTHOGRAPHY: "place" and
 * "please" differ by `c`→k vs `s`→s under the fold and never match, even though
 * they are one vowel apart in speech. Mapping spelling to sound first is what
 * makes place/please, praise/price and girded/girl comparable at all.
 *
 * Vowels survive only in initial position: Parakeet's vowel errors are its most
 * common ("Easton" for "eastern"), its consonant skeleton far more stable.
 * p/b, m/n and f/v/w are merged for the same reason `phoneticFold` merges them.
 */
function phoneticKey(word: string): string {
  const letters = word
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/^(ae|gn|kn|pn|wr)/, match => match.slice(1))
    .replace(/^x/, 's')
    .replace(/^wh/, 'w');
  let key = '';
  for (let i = 0; i < letters.length; i += 1) {
    const char = letters[i] ?? '';
    const prev = letters[i - 1] ?? '';
    const next = letters[i + 1] ?? '';
    const after = letters[i + 2] ?? '';
    if (char === prev && char !== 'c') continue; // doubled letters are one sound
    switch (char) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
        if (i === 0) key += 'A';
        break;
      case 'b':
        if (!(i === letters.length - 1 && prev === 'm')) key += 'B'; // silent b in "lamb"
        break;
      case 'c':
        if (next === 'h') {
          key += 'X';
          i += 1;
        } else if (/[iey]/.test(next))
          key += 'S'; // "place" → S, the whole point
        else key += 'K';
        break;
      case 'd':
        if (next === 'g' && /[iey]/.test(after)) {
          key += 'J';
          i += 2;
        } else key += 'T';
        break;
      case 'g':
        if (next === 'h') {
          if (/[aeiou]/.test(after)) key += 'K';
          i += 1;
        } else if (next === 'n')
          break; // silent g in "gnome"
        else if (/[iey]/.test(next)) key += 'J';
        else key += 'K';
        break;
      case 'h':
        if (!(/[aeiou]/.test(prev) && !/[aeiou]/.test(next))) key += 'H';
        break;
      case 'k':
        if (prev !== 'c') key += 'K';
        break;
      case 'p':
        if (next === 'h') {
          key += 'F';
          i += 1;
        } else key += 'B';
        break;
      case 'q':
        key += 'K';
        break;
      case 's':
        if (next === 'h') {
          key += 'X';
          i += 1;
        } else key += 'S';
        break;
      case 't':
        if (next === 'h') {
          key += '0';
          i += 1;
        } else if (next === 'i' && /[ao]/.test(after))
          key += 'X'; // "-tion"
        else key += 'T';
        break;
      case 'f':
      case 'v':
      case 'w':
        key += 'F';
        break;
      case 'x':
        key += 'KS';
        break;
      case 'z':
        key += 'S';
        break;
      case 'j':
        key += 'J';
        break;
      case 'm':
      case 'n':
        key += 'N';
        break;
      case 'l':
        key += 'L';
        break;
      case 'r':
        key += 'R';
        break;
      case 'y':
        if (/[aeiou]/.test(next)) key += 'Y';
        break;
      default:
        break;
    }
  }
  return key.replace(/(.)\1+/g, '$1');
}

/**
 * Self-graded recall app: lenient enough that "fuzzy" still counts. Threshold
 * is on `1 - lev / max(len1, len2)`, so 0.80 means up to ~20 % of the longer
 * string can differ.
 *
 * Two floors, because raw similarity cannot tell the two cases apart — both
 * "isolat" vs "isolated" (an ASR that clipped the tail: keep) and "just" vs
 * "jest" (a different word: reject) score exactly 0.75. What separates them is
 * SHAPE: an ASR truncation leaves the shorter string as a prefix of the longer
 * one, whereas a wrong answer substitutes letters mid-word. So prefix pairs
 * keep the original lenient floor and everything else has to clear a higher
 * one.
 */
const FUZZY_MIN_SIMILARITY = 0.8;
/** Prefix pairs (ASR dropped the tail) keep the original lenient floor. */
const FUZZY_TRUNCATION_MIN_SIMILARITY = 0.7;

/**
 * True when one string is a prefix of the other — the signature of an ASR that
 * clipped a word, as opposed to hearing a different one. Deliberately prefix
 * only: a shared *suffix* ("rest" inside "breast") is not a truncation and must
 * stay strict.
 */
function isTruncationPair(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length > 0 && shorter !== longer && longer.startsWith(shorter);
}

/**
 * Near-miss floors: an utterance that SOUNDS like the answer but transcribed as
 * something else. Measured on 350 field attempts — at these two floors, 12 of
 * 142 misses flip and every one is the learner saying the right word into a
 * model that mangled it: place→"Please", praise→"Price", girded with→"Girl
 * with"/"Guard with", beware→"to be aware", eastern→"Easton", his
 * sessions→"The recessions", andalusian→"And Luisi", traveler→"The travels".
 * Nothing from the "learner said a different word's meaning" class survives
 * them (girded with→"leading figure", grabbed→"to arrive" all stay misses).
 *
 * BOTH floors are load-bearing. Phonetic alone credits ascended→"Send." (a
 * 4-letter key inside an 8-letter one); the lexical floor rejects it. Lexical
 * alone is the 2026-07-25 mistake all over again.
 *
 * This path knowingly re-credits the homophone class that fix removed —
 * jest←"just", ascended←"assented", breast←"rest" — and that is the deliberate
 * trade: it credits them as `vague`, not `known`. `vague` is Rating.Hard, a
 * pass that shortens rather than extends the interval, so a wrongly-credited
 * word comes back soon. The old failure mode (silently writing `known` and
 * burying the word) is not reachable from here, while the cost it was guarding
 * against — failing a learner who answered correctly — is what actually showed
 * up in the field: 17 of these 20 attempts were graded Forgot.
 */
const NEAR_MIN_PHONETIC = 0.75;
const NEAR_MIN_LEXICAL = 0.55;

/**
 * Shared-prefix escape from the lexical floor.
 *
 * The lexical floor above is measured against the WHOLE gloss, so a long card
 * answer drags it below 0.55 even when the learner clearly produced the word:
 * girded with←"Girdle." scores 0.40, strap←"to straddle." scores 0.40. Both are
 * the learner saying the right thing into a model that clipped or extended it,
 * and both die on a floor that is really measuring gloss length.
 *
 * A shared opening on the HEAD content word is the signal that separates them
 * from a genuinely different answer, because English words that start alike
 * usually sound alike from the onset — which is exactly the part of an utterance
 * an ASR gets right before it starts guessing.
 *
 * Four letters, and only four. Measured against the 162 learner-labelled misses:
 * at 4 the rule flips 5 rows, every one a real utterance, and breaches none of
 * the 18 guard pairs the earlier tightenings exist to protect. At 2 it credits
 * ascended←"Assented." (both open "as"), assembly←"Astorium.",
 * estimate←"to Eston." and leading figure←"Learned." — the precise class the
 * 2026-07-25 pass removed. At 3 three of those come back. This replaces only the
 * LEXICAL floor; the phonetic floor still has to clear on its own, so a word that
 * merely starts alike but sounds different is still a miss.
 */
const NEAR_PREFIX_LEN = 4;

/**
 * Do the expected gloss's head content word and some spoken content token open
 * with the same `NEAR_PREFIX_LEN` letters?
 */
function sharesHeadPrefix(spoken: string, expected: string): boolean {
  const head = contentWords(expected)[0];
  if (head === undefined || head.length < NEAR_PREFIX_LEN || /\d/.test(head)) return false;
  const opening = head.slice(0, NEAR_PREFIX_LEN);
  return contentWords(spoken).some(
    token => token.length >= NEAR_PREFIX_LEN && token.slice(0, NEAR_PREFIX_LEN) === opening,
  );
}

/**
 * Length floors, for the same reason `PHONETIC_MIN_LEN` exists: a consonant
 * skeleton is not evidence on a short word. "cat"/"cot"/"cut" all key to KT and
 * "jest"/"just" to JST — three-letter vocabulary would collapse wholesale. The
 * shortest answer this path legitimately rescues is "place" (5 chars, key BLS),
 * so both floors sit just under it and every genuinely short word is left to the
 * strict layers above.
 */
const NEAR_MIN_EXPECTED_LEN = 5;
const NEAR_MIN_KEY_LEN = 3;

/**
 * Does the utterance sound like the expected answer? Compares phonetic keys of
 * the whole (function-word-stripped) utterance and of each token, so a one-word
 * answer buried in ASR scaffolding still lines up.
 */
function phoneticNearness(spoken: string, expected: string): number {
  const spokenText = stripLeadingFunctionWords(spoken);
  const expectedText = stripLeadingFunctionWords(expected);
  const expectedKey = phoneticKey(expectedText);
  if (expectedText.length < NEAR_MIN_EXPECTED_LEN || expectedKey.length < NEAR_MIN_KEY_LEN) {
    return 0;
  }

  // Compare against the head content word as well as the whole gloss, mirroring
  // the way spoken tokens are already tried individually. Without this a gloss
  // that carries a second word is unreachable from a one-word utterance:
  // "girded with" keys the trailing "with" too, so "Girdle." can never line up
  // no matter how well `girdle`/`girded` actually match.
  const expectedKeys = [expectedKey];
  const head = contentWords(expectedText)[0];
  if (head !== undefined && head !== expectedText && head.length >= NEAR_MIN_EXPECTED_LEN) {
    const headKey = phoneticKey(head);
    if (headKey.length >= NEAR_MIN_KEY_LEN) expectedKeys.push(headKey);
  }

  let best = 0;
  for (const key of expectedKeys) {
    const whole = similarityRatio(phoneticKey(spokenText), key);
    if (whole > best) best = whole;
    for (const token of spokenText.split(' ')) {
      if (!token) continue;
      const sim = similarityRatio(phoneticKey(token), key);
      if (sim > best) best = sim;
    }
  }
  return best;
}

export interface SingleWordMatchResult {
  matched: boolean;
  method: MatchMethod;
  /** What this match is worth, in WordConfidence terms: 'known' for a real
   *  match, 'vague' for the phonetic near path, 'unknown' for a miss. */
  credit: MatchCredit;
  /** Best similarity score across compared variants (1.0 = identical). Always
   *  reported so the HUD can show "match 0.82" / "miss 0.41". */
  similarity: number;
  /** Normalized spoken text — surfaced for debug / analytics. */
  normalizedSpoken: string;
  /** Normalized expected text — surfaced for debug / analytics. */
  normalizedExpected: string;
}

function similarityRatio(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

/**
 * Did the user say the expected single-word English answer? Looks at every
 * spoken token (so an ASR split like "photo" + "synthesis" still matches
 * "photosynthesis") and accepts: exact, within length-scaled edit budget, or
 * near-homophone fold (long words only). Falls back to a despaced compare so
 * "new york" vs "newyork" passes.
 */
function matchAgainstOneExpected({
  spoken,
  expected,
}: {
  spoken: string;
  expected: string;
}): SingleWordMatchResult {
  const normalizedSpoken = normalize(spoken);
  const normalizedExpected = normalize(expected);

  if (normalizedSpoken.length === 0) {
    return {
      matched: false,
      credit: 'unknown',
      method: 'miss',
      similarity: 0,
      normalizedSpoken,
      normalizedExpected,
    };
  }
  if (ASR_HALLUCINATIONS.has(normalizedSpoken)) {
    return {
      matched: false,
      credit: 'unknown',
      method: 'hallucination',
      similarity: 0,
      normalizedSpoken,
      normalizedExpected,
    };
  }
  if (normalizedExpected.length === 0) {
    return {
      matched: false,
      credit: 'unknown',
      method: 'miss',
      similarity: 0,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  if (normalizedSpoken === normalizedExpected) {
    return {
      matched: true,
      credit: 'known',
      method: 'exact',
      similarity: 1,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  const spokenTokens = normalizedSpoken.split(' ').filter(Boolean);
  // Exact token hit anywhere in the utterance ("the answer is knowledge").
  if (spokenTokens.includes(normalizedExpected)) {
    return {
      matched: true,
      credit: 'known',
      method: 'exact',
      similarity: 1,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  // Curated equivalence: letter-name truncation ("bee"→"b"), number word↔digit
  // ("three"/"3") and classic homophones ("flour"/"flower"). Treated as full
  // credit — the learner said the right answer, the ASR just picked a homophone.
  for (const tok of spokenTokens) {
    if (equivalentTokens(tok, normalizedExpected)) {
      return {
        matched: true,
        credit: 'known',
        method: 'equivalent',
        similarity: 1,
        normalizedSpoken,
        normalizedExpected,
      };
    }
  }

  // Inflection leniency: a different grammatical form of the right word still
  // counts ("books"→"book", "running"→"run", "quickly"→"quick"). Single-word,
  // non-digit expected only; full credit.
  if (!normalizedExpected.includes(' ') && !/\d/.test(normalizedExpected)) {
    const expectedVariants = new Set(inflectionVariants(normalizedExpected));
    for (const tok of spokenTokens) {
      if (inflectionMatch(expectedVariants, tok)) {
        return {
          matched: true,
          credit: 'known',
          method: 'inflection',
          similarity: 1,
          normalizedSpoken,
          normalizedExpected,
        };
      }
    }
  }

  // Track the best similarity score across all comparisons — surfaced in the
  // result so the HUD can show a "miss 0.62" instead of just "miss". `bestSim`
  // is also used by the fuzzy fallback at the bottom.
  let bestSim = similarityRatio(normalizedSpoken, normalizedExpected);

  const budget = editBudget(normalizedExpected);
  if (budget > 0) {
    for (const tok of spokenTokens) {
      const sim = similarityRatio(tok, normalizedExpected);
      if (sim > bestSim) bestSim = sim;
      if (levenshtein(tok, normalizedExpected) <= budget) {
        return {
          matched: true,
          credit: 'known',
          method: 'edit',
          similarity: sim,
          normalizedSpoken,
          normalizedExpected,
        };
      }
    }
  }

  for (const tok of spokenTokens) {
    if (foldsEqual(tok, normalizedExpected)) {
      return {
        matched: true,
        credit: 'known',
        method: 'phonetic',
        similarity: Math.max(bestSim, similarityRatio(tok, normalizedExpected)),
        normalizedSpoken,
        normalizedExpected,
      };
    }
  }

  // Despaced fallback: Whisper-family models sometimes split a single word with
  // a space ("knowle dge"). Compare the despaced strings under the same budget.
  const despacedSpoken = normalizedSpoken.replace(/ /g, '');
  const despacedExpected = normalizedExpected.replace(/ /g, '');
  const despacedSim = similarityRatio(despacedSpoken, despacedExpected);
  if (despacedSim > bestSim) bestSim = despacedSim;
  if (despacedSpoken === despacedExpected) {
    return {
      matched: true,
      credit: 'known',
      method: 'exact',
      similarity: 1,
      normalizedSpoken,
      normalizedExpected,
    };
  }
  if (
    !/\d/.test(despacedExpected) &&
    despacedSpoken.length <= despacedExpected.length + 4 &&
    budget > 0 &&
    levenshtein(despacedSpoken, despacedExpected) <= budget
  ) {
    return {
      matched: true,
      credit: 'known',
      method: 'edit',
      similarity: despacedSim,
      normalizedSpoken,
      normalizedExpected,
    };
  }
  if (foldsEqual(despacedSpoken, despacedExpected)) {
    return {
      matched: true,
      credit: 'known',
      method: 'phonetic',
      similarity: despacedSim,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  // Generous fuzzy fallback: catch any close call the budget missed. Multi-
  // word phrases especially: budget(14) is 4 but the despaced strings could
  // legitimately differ by more when ASR drops/adds a syllable, and we'd
  // rather over-credit on a self-graded recall app than reject "humble
  // himself" because it was heard as "humbel himself". Digits are excluded
  // because "iso9000" vs "iso8000" should always be a miss.
  const fuzzyFloor = isTruncationPair(despacedSpoken, despacedExpected)
    ? FUZZY_TRUNCATION_MIN_SIMILARITY
    : FUZZY_MIN_SIMILARITY;
  if (!/\d/.test(despacedExpected) && bestSim >= fuzzyFloor) {
    return {
      matched: true,
      credit: 'known',
      method: 'fuzzy',
      similarity: bestSim,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  // Head-word pass: strip the gloss's grammatical scaffolding and try the same
  // same-word tests again against what is left. This is not new leniency — it
  // reruns the exact/equivalent/inflection ladder from above, only on the part of
  // the gloss the learner actually says out loud. It is what lets "were
  // eager"←"Eager." and "for close ones"←"the closed ones" through.
  //
  // Runs HERE, below every full-string layer, so it can only ever convert what
  // would otherwise be a miss. Placed above the ladder it would intercept
  // answers `edit` already credits in full and quietly demote them — "become
  // strong"←"to become strong." went known → vague when this sat higher up.
  //
  // Credit turns on how much of the gloss the head represents. When the gloss
  // reduces to ONE content word the learner produced all of it and this is a
  // pure scaffolding strip, worth full credit. When several content words
  // survive ("become strong") the head alone is a partial answer AND collides
  // across cards — قَوِيَ "become strong" and تَكُونُ "to become" share the head
  // "become" — so it credits `vague`, whose shortened interval brings the word
  // back rather than burying it.
  const expectedContent = contentWords(normalizedExpected);
  const expectedHead = expectedContent[0];
  if (expectedHead !== undefined && expectedHead !== normalizedExpected) {
    const headVariants = new Set(inflectionVariants(expectedHead));
    for (const tok of contentWords(normalizedSpoken)) {
      if (
        tok === expectedHead ||
        equivalentTokens(tok, expectedHead) ||
        inflectionMatch(headVariants, tok)
      ) {
        return {
          matched: true,
          credit: expectedContent.length === 1 ? 'known' : 'vague',
          method: 'head',
          similarity: Math.max(bestSim, similarityRatio(tok, expectedHead)),
          normalizedSpoken,
          normalizedExpected,
        };
      }
    }
  }

  // Last chance before failing the learner: did they SOUND like the answer? A
  // transcript can be the wrong string and still be the right utterance, and on
  // a recall app the kinder reading is the right one — so this credits at the
  // `vague` tier rather than rejecting. See NEAR_MIN_PHONETIC.
  if (
    !/\d/.test(despacedExpected) &&
    (bestSim >= NEAR_MIN_LEXICAL || sharesHeadPrefix(normalizedSpoken, normalizedExpected)) &&
    phoneticNearness(normalizedSpoken, normalizedExpected) >= NEAR_MIN_PHONETIC
  ) {
    return {
      matched: true,
      credit: 'vague',
      method: 'near',
      similarity: bestSim,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  return {
    matched: false,
    credit: 'unknown',
    method: 'miss',
    similarity: bestSim,
    normalizedSpoken,
    normalizedExpected,
  };
}

/**
 * Run the full ladder against one gloss string, accepting any of the
 * alternatives it lists ("return/end", "precious, noble, valuable") — see
 * `expectedAlternatives`. On a miss, reports the alternative that came closest,
 * so the debug HUD and telemetry show the comparison that actually mattered
 * rather than the raw multi-answer string.
 */
function matchAgainstGloss({
  spoken,
  expected,
}: {
  spoken: string;
  expected: string;
}): SingleWordMatchResult {
  const alternatives = expectedAlternatives(expected);
  if (alternatives.length === 1) {
    return matchAgainstOneExpected({ spoken, expected: alternatives[0] ?? expected });
  }

  let best: SingleWordMatchResult | null = null;
  for (const alternative of alternatives) {
    const result = matchAgainstOneExpected({ spoken, expected: alternative });
    if (result.matched) return result;
    if (best === null || result.similarity > best.similarity) best = result;
  }
  return best ?? matchAgainstOneExpected({ spoken, expected });
}

/**
 * Did the learner say the expected answer?
 *
 * The card's own gloss is tried first and is the only string that can earn
 * `known` credit — it is the only one we know is right. Two widenings run
 * afterwards, and ONLY after the gloss has missed, both crediting `vague`:
 *
 * - `aliases` — transcripts this learner personally pressed "Got it" on for
 *   this word. Exact normalized equality, no fuzzing: the point is to stop one
 *   recurring recognizer quirk ("lineage" transcribed as "Linear.") from
 *   re-interrupting them, not to relax grading. Built by `utils/voiceAliases`,
 *   which is also where the rules for what may be remembered live.
 * - `alternates` — how the corpus glosses this same root elsewhere
 *   (`sentence_words.english`). مَجْلِس is "assembly" on the card but
 *   "gathering" / "session" in the articles, and a learner who says one of
 *   those is right. 97% of roots carry a single gloss with no `/`-alternatives,
 *   so without this `expectedAlternatives` has nothing to work with and the
 *   learner is failed for knowing the word by a different English name.
 *
 * `vague` is Rating.Hard — a pass that SHORTENS the interval. That is the whole
 * reason both widenings are safe: neither the corpus nor the learner's own
 * override is trustworthy enough to bury a word on, but both are far better
 * than marking a right answer wrong.
 */
/**
 * Which tiers an ALIAS may be matched through.
 *
 * An alias used to be exact-string only, and the reason was sound: fuzzing one
 * would compound two approximations — transcript ≈ alias ≈ answer — and let a
 * word drift a step further from its gloss with every accept.
 *
 * What the field data showed is that exact-only cannot do the job it exists for.
 * The words that generate repeat overrides are the ones the recognizer mangles
 * DIFFERENTLY every time: `lineage` came back as "Linear.", "Linach.",
 * "Linich.", "Linch." and "Leaner edge."; `weighty` as "Wait.", "Waiting.",
 * "Wade.", "Lady" and "Oh, hey.". An accept-list keyed on exact strings never
 * converges on those, so the learner re-answers the same card forever — which
 * is precisely the "I said it right and it didn't count" complaint.
 *
 * So the line moves from "exact" to "structural or tuned-phonetic, never raw
 * fuzz". `inflection` and `head` are structural (a grammatical form of, or the
 * content head of, a string the learner already vouched for). `near` is the
 * tier with its own measured floors (NEAR_MIN_PHONETIC / NEAR_MIN_LEXICAL).
 * `edit` and `fuzzy` stay out, and they are exactly the "compounding" the old
 * rule was protecting against — `lineage`←"Lineal." via alias "linear" scores
 * 0.83 on edit distance and is still, correctly, a miss.
 *
 * Measured by replaying every real captured attempt against the learner's own
 * accept/reject labels with the accept-list rebuilt as it actually grew
 * (`scripts/replay-voice-matcher.ts`, 421 captures since the last matcher
 * change): recovers 6 of 34 labelled false negatives, up from 2, and credits
 * ZERO additional answers the learner had rejected. Re-run that script before
 * touching this set.
 *
 * Drift is bounded by construction, which the exact-only rule could not rely on:
 * an alias is stored ONLY from an explicit "Got it" (`useVoiceReview.accept`),
 * so a card auto-credited through this path adds nothing to the list. The list
 * grows only from cases the matcher still misses.
 */
const ALIAS_LADDER_TIERS = new Set<MatchMethod>([
  'exact',
  'equivalent',
  'inflection',
  'head',
  'near',
]);

export function matchSingleWord({
  spoken,
  expected,
  aliases,
  alternates,
}: {
  spoken: string;
  expected: string;
  /** Already normalized — see `normalizeAlias` in `utils/voiceAliases`. */
  aliases?: readonly string[];
  /** Raw corpus glosses; normalized here like any other expected string. */
  alternates?: readonly string[];
}): SingleWordMatchResult {
  const primary = matchAgainstGloss({ spoken, expected });
  if (primary.matched) return primary;

  const { normalizedSpoken } = primary;
  // Nothing was said, or the model produced one of its stock phrases. Neither
  // widening may rescue those: an alias keyed on "thank you" would credit every
  // future hallucination on that card.
  if (normalizedSpoken.length === 0 || primary.method === 'hallucination') return primary;

  for (const alias of aliases ?? []) {
    if (alias.length === 0) continue;
    if (alias === normalizedSpoken) {
      return {
        matched: true,
        credit: 'vague',
        method: 'alias',
        similarity: 1,
        normalizedSpoken,
        normalizedExpected: alias,
      };
    }
    // Run the alias through the gloss ladder, then keep only the tiers
    // ALIAS_LADDER_TIERS allows. Reported as `alias` and demoted to `vague`
    // either way: however it was reached, this is the learner vouching for a
    // transcript, not them producing the card's answer.
    const viaLadder = matchAgainstGloss({ spoken, expected: alias });
    if (viaLadder.matched && ALIAS_LADDER_TIERS.has(viaLadder.method)) {
      return { ...viaLadder, credit: 'vague', method: 'alias' };
    }
  }

  for (const alternate of alternates ?? []) {
    const result = matchAgainstGloss({ spoken, expected: alternate });
    // Downgraded even when the alternate matched exactly: the learner produced
    // a gloss the card never showed them, so this is credit-by-corpus, not the
    // demonstrated recall that `known` means.
    if (result.matched) return { ...result, credit: 'vague', method: 'corpus' };
  }

  return primary;
}
