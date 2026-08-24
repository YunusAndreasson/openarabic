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
 * cache() dedupes the scan across the index, the A–Z browse, and the sitemap
 * within a single request.
 */
const scanRootUsage = cache(async (): Promise<Map<number, number>> => {
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
});

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

/** Leading English function words stripped when choosing a browse bucket, so an
 *  entry files under its real initial ("to bring" → B, "a calamity" → C) instead
 *  of piling up under T/A. Only the bucket is affected; slugs are untouched. */
const BROWSE_STOP_PREFIXES = ['to ', 'the ', 'a ', 'an '];

/** Ordered browse buckets for the A–Z dictionary index. Every qualifying entry
 *  maps to exactly one, so the index links the full long tail — no orphans. */
export const DICTIONARY_BUCKETS: string[] = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0-9', 'other',
];

/** A dictionary entry matched by search, linked to its live page. */
export interface SearchResult {
  id: number;
  letters: string;
  meaning: string;
  path: string;
}

/** Raw ilike matches to gather (per field) before the usage gate narrows them. */
const SEARCH_CANDIDATE_LIMIT = 150;

/** Results returned to the search page. */
const MAX_SEARCH_RESULTS = 40;

/** Arabic diacritics (harakat, tanwin, Qur'anic annotation marks) + tatweel
 *  -- mirrors translate/word_enrichment/lexicon.py's bareword() ranges exactly
 *  (U+0610-U+061A, U+064B-U+065F, U+0670, U+06D6-U+06ED, U+0640), so search
 *  agrees with how the rest of the pipeline compares Arabic word forms. */
const ARABIC_MARKS_RE =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
/** Any Arabic-script codepoint (U+0600-U+06FF) -- detects an Arabic query. */
const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/;

function bareArabic(text: string): string {
  return text.replace(ARABIC_MARKS_RE, '');
}

/**
 * Dictionary entries whose meaning or Arabic letters contain `query`, limited
 * to ones with a live `/word/...` page (same usage gate as everywhere else —
 * search must not link to a 404). Ranked so a match at the start of the
 * meaning outranks one buried in it.
 */
export const searchDictionary = cache(
  async (query: string): Promise<SearchResult[]> => {
    const q = query.trim();
    if (!q) return [];

    const [byMeaning, byLetters] = await Promise.all([
      supabase
        .from('roots')
        .select('id, letters, meaning')
        .ilike('meaning', `%${q}%`)
        .limit(SEARCH_CANDIDATE_LIMIT),
      supabase
        .from('roots')
        .select('id, letters, meaning')
        .ilike('letters', `%${q}%`)
        .limit(SEARCH_CANDIDATE_LIMIT),
    ]);

    const byId = new Map<number, { id: number; letters: string; meaning: string }>();
    for (const r of [...(byMeaning.data || []), ...(byLetters.data || [])]) {
      if (r.meaning?.trim() && r.letters?.trim()) byId.set(r.id, r);
    }

    // A literal substring match on `letters` mostly misses Arabic queries:
    // dictionary entries are stored fully vocalised ("رَحْمَةٌ"), but people type
    // bare consonants ("رحم"). Fall back to a diacritic-stripped scan over the
    // same qualifying set the rest of the dictionary already uses.
    if (ARABIC_SCRIPT_RE.test(q)) {
      const bareQuery = bareArabic(q);
      if (bareQuery) {
        const all = await getAllDictionaryEntries();
        for (const e of all) {
          if (bareArabic(e.letters).includes(bareQuery)) byId.set(e.id, e);
        }
      }
    }
    if (!byId.size) return [];

    const ids = [...byId.keys()];
    const { data: usageRows } = await supabase
      .from('sentence_words')
      .select('root_id')
      .in('root_id', ids);

    const usage = new Map<number, number>();
    for (const row of usageRows || []) {
      usage.set(row.root_id, (usage.get(row.root_id) || 0) + 1);
    }

    const qLower = q.toLowerCase();
    const rank = (r: { meaning: string }) => {
      const m = r.meaning.toLowerCase();
      if (m === qLower) return 0;
      if (m.startsWith(qLower)) return 1;
      return 2;
    };

    return ids
      .map((id) => byId.get(id)!)
      .filter((r) => (usage.get(r.id) || 0) >= MIN_USAGES_FOR_WORD_PAGE)
      .sort((a, b) => rank(a) - rank(b) || a.meaning.localeCompare(b.meaning))
      .slice(0, MAX_SEARCH_RESULTS)
      .map((r) => ({ id: r.id, letters: r.letters, meaning: r.meaning, path: wordPagePath(r) }));
  },
);

/** The browse bucket a dictionary entry belongs to (see DICTIONARY_BUCKETS). */
export function dictionaryBucket(meaning: string): string {
  let m = meaning.trim().toLowerCase();
  for (const prefix of BROWSE_STOP_PREFIXES) {
    if (m.startsWith(prefix) && m.length > prefix.length) {
      m = m.slice(prefix.length).trimStart();
      break;
    }
  }
  const c = m[0] ?? '';
  if (c >= 'a' && c <= 'z') return c;
  if (c >= '0' && c <= '9') return '0-9';
  return 'other';
}

/** A qualifying dictionary entry with its browse bucket, for the A–Z index. */
export interface BrowseEntry {
  id: number;
  letters: string;
  meaning: string;
  slug: string;
  bucket: string;
}

/**
 * Every dictionary entry that qualifies for a public page, alphabetised by
 * meaning and tagged with its browse bucket. Backs the A–Z index, whose whole
 * job is to give the long-tail word pages a real inbound internal link — many
 * are otherwise reachable only via the sitemap, which leaves them "discovered –
 * currently not indexed". cache() + the cached usage scan mean the sitemap and
 * the hub share a single scan per request.
 */
export const getAllDictionaryEntries = cache(
  async (): Promise<BrowseEntry[]> => {
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
      Array.from(
        { length: Math.ceil((rootCount || 0) / SCAN_PAGE_SIZE) },
        (_, i) =>
          supabase
            .from('roots')
            .select('id, meaning, letters')
            .range(i * SCAN_PAGE_SIZE, i * SCAN_PAGE_SIZE + SCAN_PAGE_SIZE - 1),
      ),
    );

    const entries: BrowseEntry[] = [];
    for (const { data } of rootPages) {
      for (const root of data || []) {
        if (
          qualifying.has(root.id) &&
          root.meaning?.trim() &&
          root.letters?.trim()
        ) {
          entries.push({
            id: root.id,
            letters: root.letters,
            meaning: root.meaning,
            slug: wordPageSlug(root),
            bucket: dictionaryBucket(root.meaning),
          });
        }
      }
    }

    entries.sort((a, b) => a.meaning.localeCompare(b.meaning));
    return entries;
  },
);

/** The browse buckets that actually contain entries, in A–Z order. Drives the
 *  A–Z nav and the dictionary letter URLs in the sitemap. */
export async function getDictionaryLetters(): Promise<string[]> {
  const entries = await getAllDictionaryEntries();
  const present = new Set(entries.map((e) => e.bucket));
  return DICTIONARY_BUCKETS.filter((b) => present.has(b));
}

/**
 * Slugs for every qualifying dictionary entry, for the sitemap. Derived from the
 * shared entry scan so the sitemap render only scans once.
 */
export async function getWordPagesForSitemap(): Promise<
  Array<{ slug: string }>
> {
  const entries = await getAllDictionaryEntries();
  return entries.map((e) => ({ slug: e.slug }));
}
