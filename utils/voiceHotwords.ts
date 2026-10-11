/**
 * Session hotwords for the Parakeet recogniser — the phrases its beam search is
 * nudged toward while a review is open.
 *
 * The vocabulary is every answer in the session, never the current card's
 * alone. Hotwords are fixed when the recogniser is built, so a per-card list
 * would mean rebuilding a 110M-parameter model on every card; and a list of one
 * would tell the recogniser what to hear, which is not a recall test.
 */
import { VOICE_HOTWORDS_MAX_PHRASES } from '@/constants/voiceModel';
import { expectedAlternatives } from '@/utils/voiceMatching';

/** Longest phrase worth biasing: past this a gloss is a definition, not an answer. */
const MAX_WORDS_PER_PHRASE = 5;

/**
 * One gloss alternative as the model spells it: lowercase letters, apostrophes
 * and single spaces. Parakeet 110M's vocabulary is lowercase and carries no
 * digits, so an alternative with a digit in it is dropped whole — blanking the
 * digit would leave "3 times" as the hotword "times", which is not the answer.
 */
function toPhrase(alternative: string): string | null {
  if (/\d/.test(alternative)) return null;
  const phrase = alternative
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/^[a-z]/.test(phrase)) return null;
  if (phrase.split(' ').length > MAX_WORDS_PER_PHRASE) return null;
  return phrase;
}

function phrasesOf(glosses: readonly string[]): Set<string> {
  const phrases = new Set<string>();
  for (const gloss of glosses) {
    // Parentheticals go before the split: "(he, she) said" is one answer, and
    // splitting first would offer "he" as a hotword.
    for (const alternative of expectedAlternatives(gloss.replace(/\([^)]*\)/g, ' '))) {
      const phrase = toPhrase(alternative);
      if (phrase) phrases.add(phrase);
    }
  }
  return phrases;
}

/**
 * One phrase per line, sorted, so the same vocabulary is always the same string
 * and never rebuilds the recogniser. Empty when there is nothing safe to bias
 * toward: one phrase, or too many.
 */
function toHotwords(phrases: ReadonlySet<string>): string {
  if (phrases.size < 2 || phrases.size > VOICE_HOTWORDS_MAX_PHRASES) return '';
  return [...phrases].sort().join('\n') + '\n';
}

/**
 * The vocabulary after a session offers its glosses.
 *
 * A vocabulary only ever grows: the recogniser is rebuilt for every new one, so
 * a session whose answers it already covers returns `current` itself and costs
 * nothing, and one that brings new answers adds them to what is there. Growing
 * also keeps the list from ever narrowing toward the card in hand. Only when the
 * union would pass the cap does the new session's vocabulary replace the old —
 * and only if it is a vocabulary itself. A session too large to bias toward, or
 * a single-phrase one, leaves `current` in place: answering it with the empty string threw away a working
 * vocabulary and rebuilt the recogniser unbiased at the first card, for the
 * long-backlog sessions least able to afford the wait.
 */
export function mergeHotwords(current: string, glosses: readonly string[]): string {
  const offered = phrasesOf(glosses);
  const merged = new Set(current.split('\n').filter(Boolean));
  const before = merged.size;
  for (const phrase of offered) merged.add(phrase);
  if (merged.size === before) return current;
  if (merged.size <= VOICE_HOTWORDS_MAX_PHRASES) return toHotwords(merged);
  return toHotwords(offered) || current;
}

/** How many phrases a hotwords string carries. */
export function countHotwords(hotwords: string): number {
  return hotwords.split('\n').filter(Boolean).length;
}

/**
 * The `bpe.vocab` sherpa-onnx needs to tokenise hotwords, rebuilt from the
 * model's own `tokens.txt` because the Parakeet archive does not ship one.
 *
 * Equal scores make the tokeniser pick the longest match, as in sherpa-onnx's
 * Parakeet hotword example. Token spelling and order are kept exactly,
 * including SentencePiece's word-boundary marker.
 */
export function parakeetBpeVocab(tokens: string): string {
  const lines = tokens.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) throw new Error('Parakeet tokens.txt is empty');
  return (
    lines
      .map(line => {
        const match = /^(\S+)\s+\d+\s*$/.exec(line);
        if (!match) throw new Error('Invalid Parakeet token entry');
        return `${match[1]}\t-1.0`;
      })
      .join('\n') + '\n'
  );
}
