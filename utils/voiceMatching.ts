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
    .replace(/[-–—]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
 * Edit tolerance scaled to word length (~length/3): a clearly-intended answer
 * with one mispronounced consonant should still pass on a self-graded recall
 * app. Words <4 chars stay strict (cat/cot is a different word), digits get
 * none.
 */
export function editBudget(word: string): number {
  if (/\d/.test(word)) return 0;
  if (word.length >= 12) return 4;
  if (word.length >= 8) return 3;
  if (word.length >= 6) return 2;
  if (word.length >= 4) return 1;
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

/** Min length for phonetic-fold matching — shorter words collide once folded. */
const PHONETIC_MIN_LEN = 6;

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
  | 'hallucination'
  | 'miss';

/**
 * Self-graded recall app: lenient enough that "fuzzy" still counts. Threshold
 * is on `1 - lev / max(len1, len2)`, so 0.70 means up to ~30 % of the longer
 * string can differ. Picks up: e/l swap ("humbel" → "humble"), single-token
 * drop on a phrase ("humble" caught instead of "humble himself"), and similar
 * close-but-not-exact ASR mishears that the length-scaled edit budget misses.
 */
const FUZZY_MIN_SIMILARITY = 0.7;

export interface SingleWordMatchResult {
  matched: boolean;
  method: MatchMethod;
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
export function matchSingleWord({
  spoken,
  expected,
}: {
  spoken: string;
  expected: string;
}): SingleWordMatchResult {
  const normalizedSpoken = normalize(spoken);
  const normalizedExpected = normalize(expected);

  if (normalizedSpoken.length === 0) {
    return { matched: false, method: 'miss', similarity: 0, normalizedSpoken, normalizedExpected };
  }
  if (ASR_HALLUCINATIONS.has(normalizedSpoken)) {
    return {
      matched: false,
      method: 'hallucination',
      similarity: 0,
      normalizedSpoken,
      normalizedExpected,
    };
  }
  if (normalizedExpected.length === 0) {
    return { matched: false, method: 'miss', similarity: 0, normalizedSpoken, normalizedExpected };
  }

  if (normalizedSpoken === normalizedExpected) {
    return {
      matched: true,
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
      method: 'edit',
      similarity: despacedSim,
      normalizedSpoken,
      normalizedExpected,
    };
  }
  if (foldsEqual(despacedSpoken, despacedExpected)) {
    return {
      matched: true,
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
  if (!/\d/.test(despacedExpected) && bestSim >= FUZZY_MIN_SIMILARITY) {
    return {
      matched: true,
      method: 'fuzzy',
      similarity: bestSim,
      normalizedSpoken,
      normalizedExpected,
    };
  }

  return {
    matched: false,
    method: 'miss',
    similarity: bestSim,
    normalizedSpoken,
    normalizedExpected,
  };
}
