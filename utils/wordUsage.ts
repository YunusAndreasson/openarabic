import type { SentenceWithWords } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';
import type { ColoredSegment } from '@/types/vocabulary.types';
import { capitalizeFirstLetter, cleanWordText } from '@/utils/stringUtils';

/**
 * Distinct surface forms kept. Six fits two lines at the compact Arabic size on
 * the narrowest phone; past that the row starts competing with the examples
 * below it, which are the thing that actually teaches the usage.
 */
const WORD_FORMS_LIMIT = 6;

export interface WordForm {
  /** Rendered exactly as stored, so it agrees with its own segments. */
  form: string;
  /** Grammar colouring, when it still describes this exact string. */
  segments?: ColoredSegment[];
}

export interface WordUsage {
  /**
   * "Noun", "Verb" — from the corpus, because `roots` has no such column.
   * Capitalised on the way out: `word_types.name` is stored lower case, and the
   * `overline` type deliberately does not upper-case (it expects sentence case
   * from every caller), so the raw value rendered a lower-case "noun".
   */
  partOfSpeech: string | null;
  /** The inflected forms the corpus shows this word in, lemma excluded. */
  forms: WordForm[];
}

interface WordUsageOptions {
  rootId: RootId | undefined;
  /** `roots.letters` — the lemma, excluded from the forms it appears as. */
  lemma: string | undefined;
  /** Already-loaded examples. This hook fetches nothing. */
  sentences: SentenceWithWords[];
}

/**
 * What the corpus knows about a word beyond its dictionary entry.
 *
 * Both facts fall out of rows the word screen has already paid for and was
 * throwing away: every example sentence arrives with each word's `word_type` and
 * its inflected `word_form`. `roots` itself holds only `letters` and `meaning`,
 * so the corpus is the *only* place either can come from.
 *
 * A plain derivation, not a hook: it fetches nothing and subscribes to nothing,
 * it just reads whatever `useSentencesByWord` already returned — so it can never
 * disagree with the examples drawn below it. Lives beside the other pure word
 * derivations (`memoryHorizon`, `urgencyScore`, `dictionaryMeter`), and the
 * React Compiler memoises it at the call site.
 */
export function getWordUsage({ rootId, lemma, sentences }: WordUsageOptions): WordUsage {
  if (rootId === undefined) return { partOfSpeech: null, forms: [] };

  const lemmaText = cleanWordText(lemma ?? '');

  // Occurrences of THIS root, in the order the sentences arrived — which after
  // the service's ranking is easiest-usage-first.
  const occurrences = sentences.flatMap(sentence =>
    sentence.sentence_words.filter(candidate => candidate.root_id === rootId),
  );

  const typeCounts = new Map<string, number>();
  const forms: WordForm[] = [];
  const seenForms = new Set<string>();

  for (const occurrence of occurrences) {
    const name = occurrence.word_type?.name;
    if (name) typeCounts.set(name, (typeCounts.get(name) ?? 0) + 1);

    if (forms.length >= WORD_FORMS_LIMIT) continue;

    const form = cleanWordText(occurrence.word_form);
    // The lemma is already the hero at the top of the screen; repeating it here
    // would make the row look like it had failed to find anything.
    if (!form || form === lemmaText || seenForms.has(form)) continue;
    seenForms.add(form);

    forms.push({
      form,
      // Segments were computed against the RAW form. If cleaning changed the
      // string they no longer describe what is about to be painted, so the form
      // renders plain rather than mis-coloured.
      segments: form === occurrence.word_form ? occurrence.coloredSegments : undefined,
    });
  }

  // The mode, with ties falling to the first-seen — i.e. the easiest occurrence
  // among the sentences this screen is showing.
  //
  // NOT guaranteed to agree with the review card's answer face: that takes the
  // single easiest row from `getExamplesForRoots`, a different query over the
  // whole corpus, which need not be inside these five sentences. A root used as
  // a noun in most of them and as a verb in the row that query picks will be
  // labelled differently on the two screens. Taking the mode of what is on
  // screen is the right answer HERE — it describes the examples printed below
  // it — but do not read it as a cross-screen invariant.
  let partOfSpeech: string | null = null;
  let best = 0;
  for (const [name, count] of typeCounts) {
    if (count > best) {
      best = count;
      partOfSpeech = name;
    }
  }

  return { partOfSpeech: partOfSpeech && capitalizeFirstLetter(partOfSpeech), forms };
}
