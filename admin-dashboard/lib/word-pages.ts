import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { slugifyText, parseTrailingId, generateSlug } from '@/lib/slugify';
import type { Database } from '@/lib/database.types';

type Root = Database['public']['Tables']['roots']['Row'];

const SUPABASE_AUDIO_BASE =
  'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio';

/**
 * Minimum number of in-article usages an entry must have to get its own public
 * page. Gating on real usage keeps every page substantive (a definition backed
 * by genuine example sentences) and is the lever for throttling the indexed
 * footprint: raise this if Search Console shows thin-content/coverage issues.
 */
export const MIN_USAGES_FOR_WORD_PAGE = 1;

/** How many example sentences to render on a single dictionary page. */
const MAX_EXAMPLES = 24;

/** Page size for the sitemap usage scan (PostgREST caps rows at 1000). */
const SCAN_PAGE_SIZE = 1000;

export interface WordUsageExample {
  wordForm: string;
  english: string;
  grammarNote: string | null;
  sentenceArabic: string;
  sentenceEnglish: string;
  sentenceAudio: string | null;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
}

/** A neighbouring dictionary entry, linked for cross-navigation + internal SEO. */
export interface RelatedWord {
  letters: string;
  meaning: string;
  path: string;
}

export interface WordEntry {
  root: Root;
  usageCount: number;
  examples: WordUsageExample[];
  related: RelatedWord[];
}

/** A dictionary entry as listed on the /dictionary hub, ranked by usage. */
export interface DictionaryEntry {
  id: number;
  letters: string;
  meaning: string;
  usageCount: number;
}

/** How many related words to surface on a single dictionary page. */
const MAX_RELATED = 12;

/** Descriptive, ASCII slug for a dictionary entry: "heart-5205". */
export function wordPageSlug(root: Pick<Root, 'id' | 'meaning'>): string {
  return `${slugifyText(root.meaning) || 'word'}-${root.id}`;
}

export function wordPagePath(root: Pick<Root, 'id' | 'meaning'>): string {
  return `/word/${wordPageSlug(root)}`;
}

export { parseTrailingId as parseWordId };

/** Full URL for a root audio file (Arabic or English pronunciation). */
export function rootAudioUrl(file: string | null | undefined): string | null {
  if (!file) return null;
  if (file.startsWith('http://') || file.startsWith('https://')) return file;
  return `${SUPABASE_AUDIO_BASE}/${file}`;
}

/**
 * Fetch a dictionary entry plus real example sentences that use it.
 * Returns null when the entry is missing or has fewer than the usage threshold
 * (so a thin entry 404s instead of becoming an indexable doorway page).
 * cache() dedupes across generateMetadata + the page render.
 */
export const getWordEntry = cache(
  async (rootId: number): Promise<WordEntry | null> => {
    const { data: root, error } = await supabase
      .from('roots')
      .select('*')
      .eq('id', rootId)
      .single();

    if (error || !root || !root.meaning?.trim() || !root.letters?.trim()) {
      return null;
    }

    const { count: usageCount } = await supabase
      .from('sentence_words')
      .select('id', { count: 'exact', head: true })
      .eq('root_id', rootId);

    if (!usageCount || usageCount < MIN_USAGES_FOR_WORD_PAGE) return null;

    // The inflected surface forms of this entry, with their grammar notes.
    const { data: words } = await supabase
      .from('sentence_words')
      .select('id, word_form, english, grammar_note, sentence_id')
      .eq('root_id', rootId)
      .order('id', { ascending: true })
      .limit(MAX_EXAMPLES);

    const wordRows = words || [];
    const sentenceIds = [...new Set(wordRows.map((w) => w.sentence_id))];

    const { data: sentences } = sentenceIds.length
      ? await supabase
          .from('article_sentences')
          .select('id, arabic, english, article_id, audio_url')
          .in('id', sentenceIds)
      : { data: [] };

    const sentenceById = new Map((sentences || []).map((s) => [s.id, s]));
    const articleIds = [
      ...new Set((sentences || []).map((s) => s.article_id)),
    ];

    const { data: articles } = articleIds.length
      ? await supabase.from('articles').select('id, title').in('id', articleIds)
      : { data: [] };

    const articleById = new Map((articles || []).map((a) => [a.id, a]));

    const examples: WordUsageExample[] = [];
    for (const w of wordRows) {
      const sentence = sentenceById.get(w.sentence_id);
      if (!sentence) continue;
      const article = articleById.get(sentence.article_id);
      if (!article) continue;
      examples.push({
        wordForm: w.word_form,
        english: w.english,
        grammarNote: w.grammar_note,
        sentenceArabic: sentence.arabic,
        sentenceEnglish: sentence.english,
        sentenceAudio: rootAudioUrl(sentence.audio_url),
        articleId: article.id,
        articleTitle: article.title,
        articleSlug: generateSlug(article.title, article.id),
      });
    }

    // Related words: other dictionary entries that appear in the same sentences,
    // ranked by how often they co-occur. This weaves the ~15k word pages into
    // topical clusters — better crawlability and internal-link authority flow.
    let related: RelatedWord[] = [];
    if (sentenceIds.length) {
      const { data: coRows } = await supabase
        .from('sentence_words')
        .select('root_id')
        .in('sentence_id', sentenceIds)
        .neq('root_id', rootId)
        .limit(1000);

      const counts = new Map<number, number>();
      for (const row of coRows || []) {
        counts.set(row.root_id, (counts.get(row.root_id) || 0) + 1);
      }

      const topIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_RELATED)
        .map(([id]) => id);

      if (topIds.length) {
        const { data: relRoots } = await supabase
          .from('roots')
          .select('id, letters, meaning')
          .in('id', topIds);

        const byId = new Map((relRoots || []).map((r) => [r.id, r]));
        related = topIds
          .map((id) => byId.get(id))
          .filter(
            (r): r is NonNullable<typeof r> =>
              !!r && !!r.meaning?.trim() && !!r.letters?.trim(),
          )
          .map((r) => ({
            letters: r.letters,
            meaning: r.meaning,
            path: wordPagePath(r),
          }));
      }
    }

    return { root, usageCount, examples, related };
  },
);

/**
 * Tally per-root usage across every sentence_words row (PostgREST has no
 * DISTINCT/GROUP BY, so we page through and count client-side). Subrequests run
 * in parallel; callers are crawler/ISR routes fetched rarely, so this is fine.
 */
async function scanRootUsage(): Promise<Map<number, number>> {
  const { count } = await supabase
    .from('sentence_words')
    .select('id', { count: 'exact', head: true });

  if (!count) return new Map();

  const pageCount = Math.ceil(count / SCAN_PAGE_SIZE);
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      supabase
        .from('sentence_words')
        .select('root_id')
        .range(i * SCAN_PAGE_SIZE, i * SCAN_PAGE_SIZE + SCAN_PAGE_SIZE - 1),
    ),
  );

  const usage = new Map<number, number>();
  for (const { data } of pages) {
    for (const row of data || []) {
      usage.set(row.root_id, (usage.get(row.root_id) || 0) + 1);
    }
  }
  return usage;
}

/**
 * The dictionary entries with the most in-article usage, for the /dictionary
 * hub. Ranking by usage concentrates internal-link equity on the pages most
 * likely to rank. cache() dedupes across generateMetadata + the page render;
 * the route itself is ISR-cached so the full scan runs at most once per day.
 */
export const getDictionaryIndex = cache(
  async (limit = 300): Promise<DictionaryEntry[]> => {
    const usage = await scanRootUsage();
    const ranked = [...usage.entries()]
      .filter(([, n]) => n >= MIN_USAGES_FOR_WORD_PAGE)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (!ranked.length) return [];

    const usageById = new Map(ranked);
    const ids = ranked.map(([id]) => id);

    // Chunk the id filter so each request URL stays small.
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += 150) chunks.push(ids.slice(i, i + 150));

    const results = await Promise.all(
      chunks.map((chunk) =>
        supabase.from('roots').select('id, letters, meaning').in('id', chunk),
      ),
    );

    const byId = new Map<
      number,
      { id: number; letters: string; meaning: string }
    >();
    for (const { data } of results) {
      for (const r of data || []) byId.set(r.id, r);
    }

    // Preserve the usage ranking and drop entries missing letters/meaning.
    return ids
      .map((id) => byId.get(id))
      .filter(
        (r): r is { id: number; letters: string; meaning: string } =>
          !!r && !!r.meaning?.trim() && !!r.letters?.trim(),
      )
      .map((r) => ({
        id: r.id,
        letters: r.letters,
        meaning: r.meaning,
        usageCount: usageById.get(r.id) || 0,
      }));
  },
);

/**
 * Enumerate the dictionary entries that qualify for a public page, for the
 * sitemap. Uses the shared usage scan, then loads the matching roots. This
 * route is fetched rarely (by crawlers).
 */
export async function getWordPagesForSitemap(): Promise<
  Array<{ slug: string }>
> {
  const usage = await scanRootUsage();
  if (!usage.size) return [];

  const qualifying = new Set(
    [...usage.entries()]
      .filter(([, n]) => n >= MIN_USAGES_FOR_WORD_PAGE)
      .map(([id]) => id),
  );

  // Walk the roots table in pages and keep the qualifying entries. Paging by
  // range (rather than a huge .in() of ids) keeps each request URL small.
  const { count: rootCount } = await supabase
    .from('roots')
    .select('id', { count: 'exact', head: true });

  const rootPages = await Promise.all(
    Array.from({ length: Math.ceil((rootCount || 0) / SCAN_PAGE_SIZE) }, (_, i) =>
      supabase
        .from('roots')
        .select('id, meaning, letters')
        .range(i * SCAN_PAGE_SIZE, i * SCAN_PAGE_SIZE + SCAN_PAGE_SIZE - 1),
    ),
  );

  const slugs: Array<{ slug: string }> = [];
  for (const { data } of rootPages) {
    for (const root of data || []) {
      if (qualifying.has(root.id) && root.meaning?.trim() && root.letters?.trim()) {
        slugs.push({ slug: wordPageSlug(root) });
      }
    }
  }
  return slugs;
}
