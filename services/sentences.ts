import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { SentenceWordRow } from '@/types/articles.types';
import type { ArticleId, RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { ColoredSegment, SentenceWord } from '@/types/vocabulary.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery, fetchAllPages, type RequestOptions } from '@/utils/supabaseHelpers';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { mapToSentenceWord } from '@/utils/typeMappers';

const errorConfig = {
  loadByRootId: createServiceErrorConfig('sentences', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_SENTENCES,
  }),
};

/**
 * The article an example sentence came from.
 *
 * Selected alongside the sentence rather than looked up in the `articles` query
 * cache: that cache holds the published library, so a corpus sentence from
 * anything outside it would silently lose its name.
 */
export interface SentenceArticle {
  id: ArticleId;
  title: string;
}

/**
 * Sentence with full word data for display
 * Includes all words in the sentence for proper color-coding
 */
export interface SentenceWithWords extends Tables<'article_sentences'> {
  sentence_words: SentenceWord[];
  /** `null` when the article is unpublished or hidden by RLS. */
  article: SentenceArticle | null;
}

/**
 * Raw row type from database query
 */
interface SentenceWithWordsRow extends Tables<'article_sentences'> {
  sentence_words: SentenceWordRow[];
  article: { id: number; title: string } | null;
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
    // Branded explicitly rather than carried by the spread — the raw row's `id`
    // is a plain number and the spread would not narrow it.
    article: row.article ? { id: row.article.id as ArticleId, title: row.article.title } : null,
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

/** Occurrence rows pulled per example sentence before deduplication.
 *  `sentence_words` has one row per occurrence, so a root that appears twice in
 *  a sentence costs two rows — which is exactly how `limit` rows used to
 *  collapse into two examples. Same trade as EXAMPLE_ROWS_PER_ROOT: over-fetch
 *  a cheap id-only projection, then dedupe. */
const SENTENCE_ROWS_PER_EXAMPLE = 4;

/** PostgREST truncates an unbounded select at 1000 rows silently, so this pages.
 *  A 20-word chunk is ~200 rows; the cap is the runaway guard, not the budget. */
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
  async getExamplesForRoots(
    rootIds: RootId[],
    request: RequestOptions = {},
  ): Promise<Map<number, WordExample>> {
    if (rootIds.length === 0) return new Map();

    const wordRows = await executeQuery(
      () =>
        supabase
          .from('sentence_words')
          .select('root_id, sentence_id, word_form, difficulty_level, word_type:word_types(name)')
          .in('root_id', rootIds)
          .order('difficulty_level', { ascending: true })
          .limit(rootIds.length * EXAMPLE_ROWS_PER_ROOT),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootCount: rootIds.length },
      },
      request,
    );

    if (wordRows.length === 0) return new Map();

    // First row per root wins — the query already ordered by difficulty.
    const chosen = new Map<number, { sentenceId: number; wordForm: string; wordType: string }>();
    for (const row of wordRows) {
      if (!chosen.has(row.root_id)) {
        chosen.set(row.root_id, {
          sentenceId: row.sentence_id,
          wordForm: row.word_form,
          // Stored lower case; the answer face renders it through `overline`,
          // which expects sentence case from every caller.
          wordType: capitalizeFirstLetter(row.word_type.name),
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
      request,
    );

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
  async getGlossAlternatesForRoots(
    rootIds: RootId[],
    request: RequestOptions = {},
  ): Promise<Map<number, string[]>> {
    if (rootIds.length === 0) return new Map();

    // Ordered by `id`, which is unique: without an order the pages had no
    // stable boundary, so a page could repeat rows or skip them.
    const rows = await fetchAllPages(
      (from, to, signal) =>
        supabase
          .from('sentence_words')
          .select('root_id, english')
          .in('root_id', rootIds)
          .order('id')
          .range(from, to)
          .abortSignal(signal),
      {
        errorConfig: offset => ({
          ...errorConfig.loadByRootId,
          analyticsProperties: { rootCount: rootIds.length, offset },
        }),
        request,
        maxPages: GLOSS_MAX_PAGES,
      },
    );

    const seen = new Map<number, Set<string>>();
    const alternates = new Map<number, string[]>();
    for (const row of rows) {
      const gloss = row.english.trim();
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
  async getSentencesByRootId(
    rootId: RootId,
    limit = 5,
    request: RequestOptions = {},
  ): Promise<SentenceWithWords[]> {
    // Which sentences to show, and in what order.
    //
    // Two things used to go wrong here. The row limit was applied BEFORE the
    // dedupe, and `sentence_words` holds one row per occurrence — so a root
    // appearing twice in one sentence burned two of the five rows and the
    // learner saw two examples where the corpus had plenty. And the parent
    // query ordered by `position`, which is a sentence's index inside its OWN
    // article and means nothing across articles.
    //
    // Same discipline as `getExamplesForRoots` above: over-fetch occurrences,
    // rank easiest-first, dedupe, then take `limit`.
    const sentenceIdsResult = await executeQuery(
      () =>
        supabase
          .from('sentence_words')
          .select('sentence_id')
          .eq('root_id', rootId)
          // The easiest usage wins. An example is there to reinforce the word,
          // not to introduce three harder ones.
          .order('difficulty_level', { ascending: true })
          // Deterministic tiebreak: difficulty is a small integer, so without it
          // Postgres is free to return a different five sentences every fetch —
          // and this query's result is cached with an infinite staleTime.
          .order('sentence_id', { ascending: true })
          .limit(limit * SENTENCE_ROWS_PER_EXAMPLE),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootId, limit },
      },
      request,
    );

    if (sentenceIdsResult.length === 0) {
      return [];
    }

    // Dedupe in arrival order, so the ranking above survives, and stop at the
    // caller's limit rather than at some number of occurrence rows.
    const sentenceIds: number[] = [];
    const seen = new Set<number>();
    for (const row of sentenceIdsResult) {
      if (seen.has(row.sentence_id)) continue;
      seen.add(row.sentence_id);
      sentenceIds.push(row.sentence_id);
      if (sentenceIds.length === limit) break;
    }

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
            article:articles(id, title),
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
          // Plain embed, NOT `articles!inner`: an unpublished or RLS-hidden
          // article must cost the example its attribution, not the example.
          .in('id', sentenceIds),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootId, sentenceCount: sentenceIds.length },
      },
      request,
    );

    // `difficulty_level` lives on `sentence_words`, so the parent query cannot
    // order by it, and `.in()` returns rows in an order Postgres does not
    // promise. The ranking has to be carried over from the first query by hand.
    const rank = new Map(sentenceIds.map((id, index) => [id, index]));

    return sentencesResult
      .map(sentence => {
        const mapped = mapToSentenceWithWords(sentence);
        // Sort words by position within each sentence — here `position` IS
        // meaningful: it is reading order inside one line.
        mapped.sentence_words.sort((a, b) => a.position - b.position);
        return mapped;
      })
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  },
};
