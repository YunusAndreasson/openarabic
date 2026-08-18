/**
 * The learner's personal accept-list for voice grading.
 *
 * When a voice answer misses, the result panel offers "Got it" — the learner
 * overruling the recognizer. This remembers what was heard so the SAME mishear
 * on the SAME word passes next time instead of interrupting them again.
 *
 * Grounded in the telemetry rather than guessed at. Replaying 727 real attempts
 * showed the accept button carries three different meanings, and only one of
 * them is worth remembering:
 *
 *   43% empty transcript   — the mic died and the learner knew the word anyway.
 *                            There is nothing to remember. `hasStorableText`.
 *   ~17% another word      — "beware" answered with "approach.", which is the
 *                            gloss of a DIFFERENT root they were drilling. An
 *                            alias here makes one utterance pass two cards
 *                            forever. `collidesWithAnotherGloss`.
 *   ~40% a real mishear    — "lineage" heard as "Linear.", "weigh" as "Wait.",
 *                            "honor" as "on her". This is the whole feature.
 *
 * Everything that survives both rules is stored, whatever its similarity to the
 * gloss: the learner said they knew it, and we believe them. The safety comes
 * from the payout, not from second-guessing the tap — an alias credits `vague`
 * (Rating.Hard), a pass that shortens the interval, so a wrongly remembered
 * mishear brings the word back sooner instead of burying it.
 */
import { normalize, stripLeadingFunctionWords } from '@/utils/voiceMatching';

/**
 * Per word, not overall. A word with a genuinely unstable transcription earns
 * several ("lineage" produced "Linear.", "Linach." and "Leaner edge." in one
 * session); past this the card has stopped being a recall test and the cap is
 * the signal that something else is wrong.
 */
export const MAX_ALIASES_PER_ROOT = 8;

/** Stored and compared in the matcher's own normalized space, so an alias is
 *  insensitive to case and the trailing full stop Parakeet likes to add. */
export function normalizeAlias(transcript: string): string {
  return normalize(transcript);
}

/** Rule 1: there has to be something to remember. Covers the dead-mic accepts,
 *  which are 43% of every "Got it" pressed so far. */
export function hasStorableText(transcript: string): boolean {
  return normalizeAlias(transcript).length > 0;
}

/**
 * Rule 2: never remember a transcript that IS another word's answer.
 *
 * The one hard limit on believing the learner. `grabbed ← "Beware."` and
 * `beware ← "approach."` are both real accepts, and both name a root the same
 * session was drilling — storing either lets one spoken word satisfy two
 * different cards from then on, silently, for good.
 *
 * Compared with leading scaffolding stripped, because the recognizer supplies
 * it and the gloss does not: "to approach" must collide with "approach".
 */
export function collidesWithAnotherGloss(
  transcript: string,
  otherGlosses: readonly string[],
): boolean {
  const heard = stripLeadingFunctionWords(normalizeAlias(transcript));
  if (heard.length === 0) return false;
  return otherGlosses.some(gloss => stripLeadingFunctionWords(normalize(gloss)) === heard);
}

/**
 * Should this "Got it" be remembered? `otherGlosses` is every OTHER answer in
 * play — the current review chunk's meanings, which is where a confusable pair
 * realistically comes from, since both words are being drilled together.
 */
export function isAliasStorable({
  transcript,
  otherGlosses,
}: {
  transcript: string;
  otherGlosses: readonly string[];
}): boolean {
  return hasStorableText(transcript) && !collidesWithAnotherGloss(transcript, otherGlosses);
}

/**
 * Add an alias to a word's list: normalized, de-duplicated, newest last, capped.
 * Returns the same array reference when nothing changed so a Redux reducer can
 * skip the write.
 */
export function addAlias(existing: readonly string[], transcript: string): readonly string[] {
  const alias = normalizeAlias(transcript);
  if (alias.length === 0 || existing.includes(alias)) return existing;
  const next = [...existing, alias];
  return next.length > MAX_ALIASES_PER_ROOT ? next.slice(next.length - MAX_ALIASES_PER_ROOT) : next;
}
