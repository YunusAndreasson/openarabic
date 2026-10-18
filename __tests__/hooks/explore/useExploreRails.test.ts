/**
 * useExploreRails — every article rail on Explore, chosen together.
 *
 * The rails used to choose independently: a new learner saw one beginner pool
 * in three rails, and a half-read text sat both under "Continue reading" and in
 * a discovery rail, where its card opened at the top instead of resuming.
 *
 * `useMultipleFeaturedArticles` is mocked to a fixed pick that deliberately
 * overlaps the other rails, so the de-duplication has something to do.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';

type ProgressRow = { last_sentence_read: number; total_sentences: number; updated_at: string };

const mockProgress = new Map<number, ProgressRow>();
let mockFeaturedPick: Article[] = [];

jest.mock('@/hooks/articles/useReadingProgress', () => ({
  useBulkReadingProgress: () => ({ data: mockProgress }),
}));

jest.mock('@/hooks/articles/useMultipleFeaturedArticles', () => ({
  MAX_FEATURED_ARTICLES: 7,
  useMultipleFeaturedArticles: () => ({ articles: mockFeaturedPick }),
}));

import { useExploreRails } from '@/hooks/explore/useExploreRails';

const article = (id: number, difficulty: number, sentences: number) =>
  ({
    id,
    difficulty_level: difficulty,
    image_url: `image-${id}.jpg`,
    article_sentences: Array.from({ length: sentences }, (_, index) => ({ id: index })),
  }) as unknown as Article;

// Beginner and short, beginner and long, advanced and short, advanced and long
const ARTICLES = [
  article(1, 1, 5),
  article(2, 2, 20),
  article(3, 1, 6),
  article(4, 5, 5),
  article(5, 5, 20),
  article(6, 3, 8),
];

const allRailIds = (rails: ReturnType<typeof useExploreRails>) => [
  ...(rails.lead?.items.map(item => item.article.id) ?? []),
  ...rails.featured.map(entry => entry.id),
  ...rails.discovery.flatMap(rail => rail.items.map(item => item.article.id)),
];

describe('useExploreRails', () => {
  beforeEach(() => {
    mockProgress.clear();
    mockFeaturedPick = [];
  });

  test('shows every text at most once across the lead, featured and discovery rails', () => {
    // Featured picks texts the starter rail and the discovery rails also want
    mockFeaturedPick = [ARTICLES[0]!, ARTICLES[1]!, ARTICLES[3]!];

    const { result } = renderHook(() => useExploreRails(ARTICLES, 0, false));

    const shown = allRailIds(result.current);
    expect(new Set(shown).size).toBe(shown.length);
    expect(result.current.lead?.title).toBe(STRINGS.SECTION_GETTING_STARTED);
  });

  test('keeps a part-read text under Continue reading and out of every other rail', () => {
    // 3 of 10 sentences: 30%
    mockProgress.set(1, { last_sentence_read: 2, total_sentences: 10, updated_at: '2026-10-01' });
    mockFeaturedPick = [ARTICLES[0]!, ARTICLES[2]!];

    const { result } = renderHook(() => useExploreRails(ARTICLES, 0, false));
    const { lead, featured, discovery } = result.current;

    expect(lead?.title).toBe(STRINGS.CONTINUE_READING);
    expect(lead?.resumes).toBe(true);
    expect(lead?.items.map(item => item.article.id)).toEqual([1]);
    expect(featured.map(entry => entry.id)).not.toContain(1);
    expect(discovery.flatMap(rail => rail.items.map(item => item.article.id))).not.toContain(1);
  });

  test('keeps a finished text out of the discovery rails', () => {
    mockProgress.set(4, { last_sentence_read: 4, total_sentences: 5, updated_at: '2026-10-01' });

    const { result } = renderHook(() => useExploreRails(ARTICLES, 0, false));

    expect(allRailIds(result.current)).not.toContain(4);
  });

  // The "Get started" card and a rail headed "Getting started" one line apart
  // said the same thing twice.
  test('drops the starter rail while the checklist is up, and leads Featured with its texts', () => {
    const { result: withoutChecklist } = renderHook(() => useExploreRails(ARTICLES, 0, false));
    const starterIds = withoutChecklist.current.lead?.items.map(item => item.article.id) ?? [];
    expect(starterIds.length).toBeGreaterThan(0);

    const { result } = renderHook(() => useExploreRails(ARTICLES, 0, true));

    expect(result.current.lead).toBeNull();
    expect(result.current.featured.slice(0, starterIds.length).map(entry => entry.id)).toEqual(
      starterIds,
    );
  });

  test('a Continue reading rail stays while the checklist is up', () => {
    mockProgress.set(2, { last_sentence_read: 4, total_sentences: 20, updated_at: '2026-10-01' });

    const { result } = renderHook(() => useExploreRails(ARTICLES, 0, true));

    expect(result.current.lead?.title).toBe(STRINGS.CONTINUE_READING);
  });

  test('shows nothing without a catalogue', () => {
    const { result } = renderHook(() => useExploreRails([], 0, false));

    expect(result.current).toEqual({ lead: null, featured: [], discovery: [] });
  });
});
