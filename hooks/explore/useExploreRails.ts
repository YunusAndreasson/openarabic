import { COMPLETION_THRESHOLD } from '@/constants/layout';
import { APP_SESSION_ID } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import {
  MAX_FEATURED_ARTICLES,
  useMultipleFeaturedArticles,
} from '@/hooks/articles/useMultipleFeaturedArticles';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { ReadingProgress } from '@/services/readingProgress';
import type { Article } from '@/types/articles.types';
import { deduplicateArticlesByImage, pickStarterArticles } from '@/utils/articleUtils';
import { calculateProgressPercentage, getArticleProgressPercentage } from '@/utils/progressUtils';

/** How many cards the lead rail ("Continue reading" / "Getting started") carries. */
const MAX_LEAD_ARTICLES = 5;
const MAX_ARTICLES_PER_DISCOVERY_RAIL = 8;
const SHORT_ARTICLE_MAX_SENTENCES = 10;
const LONG_ARTICLE_MIN_SENTENCES = 15;
const BEGINNER_MAX_DIFFICULTY = 3;
const ADVANCED_MIN_DIFFICULTY = 4;

export interface ArticleRailItem {
  article: Article;
  /** Reading progress 0-100 — rendered as the card's bottom progress bar */
  progress?: number;
}

/** The rail at the top of the feed: where the learner left off, or where to begin. */
export interface LeadRail {
  title: string;
  items: ArticleRailItem[];
  /** A tap resumes at the saved position (Continue reading) rather than at the top. */
  resumes: boolean;
}

export interface DiscoveryRail {
  key: string;
  title: string;
  items: ArticleRailItem[];
}

interface ExploreRails {
  /** Null when there is nothing to lead with, or when the checklist already says it. */
  lead: LeadRail | null;
  featured: Article[];
  discovery: DiscoveryRail[];
}

interface DiscoveryRailConfig {
  key: string;
  title: string;
  /** XOR'd into the session seed so each rail shuffles differently. */
  seed: number;
  matches: (article: Article) => boolean;
}

/**
 * In claim order: a text that qualifies for two rails lands in the first one.
 * Beginner and Advanced split on difficulty, Quick and Deep on length, so every
 * overlap is a difficulty rail against a length rail.
 */
const DISCOVERY_RAILS: readonly DiscoveryRailConfig[] = [
  {
    key: 'beginner',
    title: STRINGS.SECTION_BEGINNER_FRIENDLY,
    seed: 3,
    matches: article => article.difficulty_level <= BEGINNER_MAX_DIFFICULTY,
  },
  {
    key: 'short-reads',
    title: STRINGS.SECTION_SHORT_READS,
    seed: 1,
    matches: article =>
      article.article_sentences.length > 0 &&
      article.article_sentences.length < SHORT_ARTICLE_MAX_SENTENCES,
  },
  {
    key: 'long-reads',
    title: STRINGS.SECTION_LONG_READS,
    seed: 2,
    matches: article => article.article_sentences.length >= LONG_ARTICLE_MIN_SENTENCES,
  },
  {
    key: 'advanced',
    title: STRINGS.SECTION_ADVANCED,
    seed: 4,
    matches: article => article.difficulty_level >= ADVANCED_MIN_DIFFICULTY,
  },
];

/**
 * mulberry32, seeded by APP_SESSION_ID and the rail, so a rail's order is
 * stable within a session and fresh on the next launch.
 */
function seededRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates shuffle, returning the first `count` items. */
function shuffleAndSlice<T>(items: T[], count: number, seed: number): T[] {
  if (items.length === 0) return [];
  const rand = seededRandom(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = temp as T;
  }
  return arr.slice(0, count);
}

/** Partly read texts (above 0%, below completion), most recently read first. */
function getContinueReading(
  articlesData: Article[],
  progressMap: ReadonlyMap<number, ReadingProgress>,
): ArticleRailItem[] {
  const partial: { article: Article; progress: number; updatedAt: string }[] = [];

  for (const article of articlesData) {
    const row = progressMap.get(article.id);
    if (!row) continue;
    const progress = calculateProgressPercentage(row.last_sentence_read, row.total_sentences);
    if (progress > 0 && progress < COMPLETION_THRESHOLD) {
      partial.push({ article, progress, updatedAt: row.updated_at ?? '' });
    }
  }

  partial.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return partial
    .slice(0, MAX_LEAD_ARTICLES)
    .map(({ article, progress }) => ({ article, progress }));
}

/**
 * Which texts Explore shows, and in which rail — decided in one place so that a
 * text appears on the screen at most once.
 *
 * The rails used to choose independently. For a new learner that put the same
 * beginner pool in "Getting started", "Featured" and "Beginner friendly" at
 * once, and every half-read text appeared both under "Continue reading" and in
 * a discovery rail — where, opened with no resume, the same card started the
 * text over. Now each rail claims its texts in screen order and the next one
 * chooses from what is left:
 *
 * 1. **Lead** — "Continue reading" when anything is part-read, otherwise
 *    "Getting started". The starter rail stands down while the "Get started"
 *    checklist is up: the card and a rail headed "Getting started" one line
 *    apart said the same thing twice. The starter texts then lead Featured,
 *    which sits directly under the card, so they stay one tap away.
 * 2. **Featured** — the personalised pick, minus anything already claimed.
 * 3. **Discovery** — what is left, in claim order (see `DISCOVERY_RAILS`).
 *
 * Featured and Discovery hold unread texts only (progress === 0). A part-read
 * text lives under Continue reading and nowhere else, so its card always
 * resumes.
 */
export function useExploreRails(
  articlesData: Article[],
  refreshKey: number,
  isChecklistVisible: boolean,
): ExploreRails {
  const articleIds = articlesData.map(article => article.id);
  const { data: progressMap } = useBulkReadingProgress(articleIds);
  const { articles: featuredPicks } = useMultipleFeaturedArticles(
    articlesData,
    refreshKey,
    'global',
  );

  if (articlesData.length === 0) {
    return { lead: null, featured: [], discovery: [] };
  }

  const claimed = new Set<number>();
  const isUnread = (article: Article) =>
    getArticleProgressPercentage(progressMap, article.id) === 0;

  // 1. Lead
  const continueReading = getContinueReading(articlesData, progressMap);
  const starterItems =
    continueReading.length > 0
      ? []
      : pickStarterArticles(articlesData, progressMap, MAX_LEAD_ARTICLES);

  let lead: LeadRail | null = null;
  let pinnedToFeatured: Article[] = [];

  if (continueReading.length > 0) {
    lead = { title: STRINGS.CONTINUE_READING, items: continueReading, resumes: true };
  } else if (isChecklistVisible) {
    pinnedToFeatured = starterItems.map(item => item.article).filter(isUnread);
  } else if (starterItems.length > 0) {
    lead = { title: STRINGS.SECTION_GETTING_STARTED, items: starterItems, resumes: false };
  }

  for (const item of lead?.items ?? []) {
    claimed.add(item.article.id);
  }

  // 2. Featured. Its own pick is already unread-only once progress has loaded;
  // the check holds that for the provisional pick it shows before then.
  const featured: Article[] = [];
  for (const article of [...pinnedToFeatured, ...featuredPicks]) {
    if (featured.length >= MAX_FEATURED_ARTICLES) break;
    if (claimed.has(article.id) || !isUnread(article)) continue;
    claimed.add(article.id);
    featured.push(article);
  }

  // 3. Discovery
  const discovery: DiscoveryRail[] = [];
  for (const rail of DISCOVERY_RAILS) {
    const candidates = articlesData.filter(
      article => !claimed.has(article.id) && isUnread(article) && rail.matches(article),
    );
    const picked = deduplicateArticlesByImage(
      shuffleAndSlice(candidates, MAX_ARTICLES_PER_DISCOVERY_RAIL, APP_SESSION_ID ^ rail.seed),
    );
    if (picked.length === 0) continue;
    for (const article of picked) {
      claimed.add(article.id);
    }
    discovery.push({
      key: rail.key,
      title: rail.title,
      items: picked.map(article => ({ article })),
    });
  }

  return { lead, featured, discovery };
}
