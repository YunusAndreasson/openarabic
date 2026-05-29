/**
 * Single-word English answer matching for the Practice "speak the answer" flow.
 *
 * The cards in this app are guaranteed to have a single-word English meaning, so
 * we deliberately port only the short-answer path from edemind's voice grader:
 * normalize → exact match → length-scaled Levenshtein → phonetic fold. No
 * embeddings, no cosine similarity. Pure code, no React, no native deps —
 * unit-testable in isolation.
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

export type MatchMethod = 'exact' | 'edit' | 'phonetic' | 'fuzzy' | 'hallucination' | 'miss';

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
