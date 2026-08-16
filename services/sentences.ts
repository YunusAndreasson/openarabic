import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { SentenceWordRow } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { ColoredSegment, SentenceWord } from '@/types/vocabulary.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';
import { mapToSentenceWord } from '@/utils/typeMappers';

const errorConfig = {
  loadByRootId: createServiceErrorConfig('sentences', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_SENTENCES,
  }),
};

/**
 * Sentence with full word data for display
 * Includes all words in the sentence for proper color-coding
 */
export interface SentenceWithWords extends Tables<'article_sentences'> {
  sentence_words: SentenceWord[];
}

/**
 * Raw row type from database query
 */
interface SentenceWithWordsRow extends Tables<'article_sentences'> {
  sentence_words: SentenceWordRow[];
}

/**
 * Maps a raw sentence row to SentenceWithWords
 */
function mapToSentenceWithWords(row: SentenceWithWordsRow): SentenceWithWords {
  return {
    ...row,
    sentence_words: Array.isArray(row.sentence_words)
      ? row.sentence_words.map(mapToSentenceWord)
      : [],
  };
}

/**
 * One word of an example sentence, in reading order.
 *
 * Carries the per-word gloss because that is what `computeColoredSegments`
 * needs to split a form into its grammatical components — the review card
 * colours its example exactly the way the reader colours an article.
 */
export interface ExampleWord {
  position: number;
  wordForm: string;
  /** The word's own gloss — the analyzer needs both halves to split a form. */
  english: string;
  rootId: number;
  /** True for the practised root. Comes from the corpus rather than a text
   *  match, so a form that appears twice (or inside a longer word) can't
   *  mis-mark the sentence. */
  isTarget: boolean;
  /** Attached by useReviewExamples once the theme's colours are known — the
   *  same load-time precompute `useSentencesByWord` does for the reader. */
  coloredSegments?: ColoredSegment[];
}

/**
 * One example of a practised word in real use, for the review card's answer
 * face. Flatter and smaller than the word graph `getSentencesByRootId` returns
 * for the reader: no roots, no audio per word, no article context — just enough
 * to render one grammar-coloured line and play it.
 */
export interface WordExample {
  rootId: number;
  sentenceId: number;
  /** The sentence as it appears in the article. Kept for accessibility labels
   *  and as the fallback when the word breakdown is missing. */
  arabic: string;
  english: string;
  /** Sentence audio, played only on an explicit tap. */
  audioUrl: string | null;
  /** The practised root's inflected form in this sentence. */
  wordForm: string;
  /** The practised word's grammatical class ("Verb", "Noun"). Shown above the
   *  Arabic on the answer face — never on the question face, where it would
   *  narrow the guess. */
  wordType: string;
  /** Every word of the sentence, ordered by position. */
  words: ExampleWord[];
}

/** Rows pulled per root before deduplication. Sentences are ordered easiest
 *  first, so a handful per root is plenty to land a usable example while
 *  keeping one bounded query for the whole session chunk. */
const EXAMPLE_ROWS_PER_ROOT = 8;

/** Distinct corpus glosses kept per root. Measured on 20 studied roots: 3.5 new
 *  glosses each on average, but a very common root runs much higher ("who" has
 *  22 across 120 rows). Past a dozen the extras are inflected repeats of ones
 *  already in the set, and every entry costs a full ladder run on a miss. */
const GLOSS_ALTERNATES_PER_ROOT = 12;

/** PostgREST truncates an unbounded select at 1000 rows silently, so this pages.
 *  A 20-word chunk is ~200 rows; the cap is the runaway guard, not the budget. */
const GLOSS_PAGE_SIZE = 1000;
const GLOSS_MAX_PAGES = 4;

export const sentencesService = {
  /**
   * One example sentence for each of many roots, in a single round trip.
   *
   * The review session preloads this for a whole chunk at once. Calling
   * `getSentencesByRootId` per card would put a network request on every card,
   * which the review lane explicitly does not do — a warm session makes zero
   * network calls, and the debug HUD turns red when it doesn't.
   *
   * Ordered by `difficulty_level` so the easiest usage wins: the example is
   * there to reinforce the word, not to introduce three harder ones. The row
   * cap means a root can occasionally come back without an example; that is
   * intentional and the card simply omits the block rather than blocking.
   *
   * The second query pulls every word of the chosen sentences, not just the
   * practised one, because the card grammar-colours the whole line — the
   * analyzer works per word (form + its own gloss), so a sentence-level string
   * is not enough. Still two round trips for the whole chunk.
   */
  async getExamplesForRoots(rootIds: RootId[]): Promise<Map<number, WordExample>> {
    if (rootIds.length === 0) return new Map();

    const wordRows = await executeQuery(
      () =>
        supabase
          .from('sentence_words')
          .select('root_id, sentence_id, word_form, difficulty_level, word_type:word_types(name)')
          .in(
            'root_id',
            rootIds.map(id => id as number),
          )
          .order('difficulty_level', { ascending: true })
          .limit(rootIds.length * EXAMPLE_ROWS_PER_ROOT),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootCount: rootIds.length },
      },
    );

    if (!wordRows || wordRows.length === 0) return new Map();

    // First row per root wins — the query already ordered by difficulty.
    const chosen = new Map<number, { sentenceId: number; wordForm: string; wordType: string }>();
    for (const row of wordRows) {
      if (!chosen.has(row.root_id)) {
        chosen.set(row.root_id, {
          sentenceId: row.sentence_id,
          wordForm: row.word_form,
          wordType: row.word_type.name,
        });
      }
    }

    const sentenceRows = await executeQuery(
      () =>
        supabase
          .from('article_sentences')
          .select(
            'id, arabic, english, audio_url, sentence_words(position, word_form, english, root_id)',
          )
          .in('id', [...new Set([...chosen.values()].map(c => c.sentenceId))]),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { sentenceCount: chosen.size },
      },
    );

    if (!sentenceRows) return new Map();

    const byId = new Map(sentenceRows.map(s => [s.id, s]));
    const examples = new Map<number, WordExample>();
    for (const [rootId, pick] of chosen) {
      const sentence = byId.get(pick.sentenceId);
      if (!sentence?.arabic) continue;
      // Sorted here rather than in the query: the nested rows come back in an
      // order Postgres does not promise, and reading order is the whole point.
      const words: ExampleWord[] = sentence.sentence_words
        .map(word => ({
          position: word.position,
          wordForm: word.word_form,
          english: word.english,
          rootId: word.root_id,
          isTarget: word.root_id === rootId,
        }))
        .sort((a, b) => a.position - b.position);
      examples.set(rootId, {
        rootId,
        sentenceId: pick.sentenceId,
        arabic: sentence.arabic,
        english: sentence.english ?? '',
        audioUrl: sentence.audio_url ?? null,
        wordForm: pick.wordForm,
        wordType: pick.wordType,
        words,
      });
    }
    return examples;
  },

  /**
   * Every distinct English gloss the corpus uses for each of these roots.
   *
   * Voice grading compares what was said against `roots.meaning` — one string.
   * 97% of roots carry a single gloss with no `/`-alternatives, so مَجْلِس is
   * only ever "assembly" and a learner who answers "gathering", "session" or
   * "sitting" is marked wrong for knowing the word. The articles already hold
   * those other names: `sentence_words.english` is the same root glossed in
   * context, and reading it costs one bounded query against a table the review
   * lane already queries.
   *
   * Returned raw rather than normalized, because the matcher's own
   * `expectedAlternatives` splits on `/` and `,` and normalizing first would
   * weld those apart-able glosses into one token.
   *
   * Two things this deliberately does NOT do. It does not filter out inflected
   * or article-prefixed forms ("the matter", "his command", "and matters") —
   * they cost nothing, since the matcher strips that scaffolding anyway. And it
   * does not try to detect a wrong gloss in the corpus: root 10514 is "defame"
   * and also carries "the cup". That is what the caller crediting `vague`
   * instead of `known` is for — see `matchSingleWord`.
   */
  async getGlossAlternatesForRoots(rootIds: RootId[]): Promise<Map<number, string[]>> {
    if (rootIds.length === 0) return new Map();

    const ids = rootIds.map(id => id as number);
    const rows: { root_id: number; english: string | null }[] = [];
    for (let page = 0; page < GLOSS_MAX_PAGES; page++) {
      const batch = await executeQuery(
        () =>
          supabase
            .from('sentence_words')
            .select('root_id, english')
            .in('root_id', ids)
            .range(page * GLOSS_PAGE_SIZE, (page + 1) * GLOSS_PAGE_SIZE - 1),
        {
          ...errorConfig.loadByRootId,
          analyticsProperties: { rootCount: rootIds.length, page },
        },
      );
      if (batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < GLOSS_PAGE_SIZE) break;
    }

    const seen = new Map<number, Set<string>>();
    const alternates = new Map<number, string[]>();
    for (const row of rows) {
      const gloss = row.english?.trim();
      if (!gloss) continue;
      const key = gloss.toLowerCase();
      let keys = seen.get(row.root_id);
      if (!keys) {
        keys = new Set();
        seen.set(row.root_id, keys);
        alternates.set(row.root_id, []);
      }
      const list = alternates.get(row.root_id);
      if (!list || keys.has(key) || list.length >= GLOSS_ALTERNATES_PER_ROOT) continue;
      keys.add(key);
      list.push(gloss);
    }
    return alternates;
  },

  /**
   * Get sentences containing a specific word (by root_id)
   *
   * Returns up to `limit` sentences that contain the given root,
   * with all words in each sentence for proper display.
   *
   * @param rootId - The root ID to search for
   * @param limit - Maximum number of sentences to return (default: 5)
   * @returns Array of sentences with all their words
   */
  async getSentencesByRootId(rootId: RootId, limit = 5): Promise<SentenceWithWords[]> {
    // First, find sentence IDs that contain this root
    // We need to do this in two steps because Supabase doesn't support
    // filtering nested relations and returning the parent with all children
    const sentenceIdsResult = await executeQuery(
      () =>
        supabase
          .from('sentence_words')
          .select('sentence_id')
          .eq('root_id', rootId as number)
          .limit(limit),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootId, limit },
      },
    );

    if (!sentenceIdsResult || sentenceIdsResult.length === 0) {
      return [];
    }

    // Get unique sentence IDs
    const sentenceIds = [...new Set(sentenceIdsResult.map(r => r.sentence_id))];

    // Now fetch the full sentences with all their words
    const sentencesResult = await executeQuery(
      () =>
        supabase
          .from('article_sentences')
          .select(
            `
            id,
            position,
            arabic,
            english,
            article_id,
            audio_url,
            audio_url_bilingual,
            audio_url_english,
            arabic_repeat,
            english_repeat,
            sentence_words(
              id,
              position,
              word_form,
              english,
              difficulty_level,
              grammar_note,
              root_id,
              sentence_id,
              word_type_id,
              audio_url,
              root:roots(id, letters, meaning, audio_url, audio_url_en),
              word_type:word_types(id, name)
            )
          `,
          )
          .in('id', sentenceIds)
          .order('position', { ascending: true })
          .overrideTypes<SentenceWithWordsRow[], { merge: false }>(),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootId, sentenceCount: sentenceIds.length },
      },
    );

    if (!sentencesResult) {
      return [];
    }

    // Map to typed result and sort sentence_words by position
    return sentencesResult.map(sentence => {
      const mapped = mapToSentenceWithWords(sentence);
      // Sort words by position within each sentence
      mapped.sentence_words.sort((a, b) => a.position - b.position);
      return mapped;
    });
  },
};
