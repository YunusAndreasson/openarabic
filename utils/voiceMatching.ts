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
function expectedAlternatives(expected: string): string[] {
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

export type MatchMethod =
  | 'exact'
  | 'equivalent'
  | 'inflection'
  | 'edit'
  | 'phonetic'
  | 'fuzzy'
  | 'near'
  | 'hallucination'
  | 'miss';

/**
 * How much credit a match is worth. Every exact/equivalent/inflection/edit/
 * fuzzy path is `known` — the learner demonstrably produced the answer. The
 * `near` path is `vague`: the utterance is acoustically the answer but the
 * transcript isn't, so we credit it rather than fail the learner, at the lower
 * confidence tier. See NEAR_MIN_PHONETIC for why that tier is the whole trick.
 */
export type MatchCredit = 'known' | 'vague' | 'unknown';

/**
 * Grammatical scaffolding Parakeet adds to a one-word answer. The model is
 * trained on running speech, so a bare gloss comes back as "to count", "the
 * travels", "a garden" — 56 of 142 field misses started with one of these and
 * the dictionary gloss almost never does (3 of 142).
 */
const LEADING_FUNCTION_WORDS = /^(?:to|the|a|an)\s+/;

function stripLeadingFunctionWords(text: string): string {
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
export function phoneticKey(word: string): string {
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
  let best = similarityRatio(phoneticKey(spokenText), expectedKey);
  for (const token of spokenText.split(' ')) {
    if (!token) continue;
    const sim = similarityRatio(phoneticKey(token), expectedKey);
    if (sim > best) best = sim;
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

  // Last chance before failing the learner: did they SOUND like the answer? A
  // transcript can be the wrong string and still be the right utterance, and on
  // a recall app the kinder reading is the right one — so this credits at the
  // `vague` tier rather than rejecting. See NEAR_MIN_PHONETIC.
  if (
    !/\d/.test(despacedExpected) &&
    bestSim >= NEAR_MIN_LEXICAL &&
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
 * Did the learner say the expected answer? Wraps the matcher so a gloss that
 * lists alternatives ("return/end", "precious, noble, valuable") accepts ANY of
 * them — see `expectedAlternatives`. On a miss, reports the alternative that
 * came closest, so the debug HUD and telemetry show the comparison that
 * actually mattered rather than the raw multi-answer string.
 */
export function matchSingleWord({
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
