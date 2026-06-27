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

export interface WordEntry {
  root: Root;
  usageCount: number;
  examples: WordUsageExample[];
}

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

    return { root, usageCount, examples };
  },
);

/**
 * Enumerate the dictionary entries that qualify for a public page, for the
 * sitemap. Scans sentence_words once to tally per-root usage (PostgREST has no
 * DISTINCT), then loads the matching roots. Subrequests run in parallel so the
 * sitemap stays fast; this route is fetched rarely (by crawlers).
 */
export async function getWordPagesForSitemap(): Promise<
  Array<{ slug: string }>
> {
  const { count } = await supabase
    .from('sentence_words')
    .select('id', { count: 'exact', head: true });

  if (!count) return [];

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
