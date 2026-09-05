/**
 * Searching the texts: what matches, and in what order.
 *
 * The two cases that justify the whole normalizer are here — an unaccented
 * query reaching an accented book title, and an undiacritized Arabic query
 * reaching vocalised body text. Both fail against the raw database strings,
 * which is why the search cannot be a server-side `ilike`.
 */

// Unmock React Query so the real select/caching path runs.
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { articleId, authorId, categoryId } from '@/__tests__/helpers/ids';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { useArticleSearch } from '@/hooks/articles/useArticleSearch';
import { articlesService } from '@/services/articles';
import type { Article, SearchCorpusSentence } from '@/types/articles.types';

jest.mock('@/services/articles');

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;

const makeArticle = (id: number, overrides: Partial<Article> & Pick<Article, 'title'>): Article =>
  ({
    id: articleId(id),
    created_at: '',
    published: true,
    book: null,
    summary: '',
    image_url: '',
    audio_url: '',
    audio_url_bilingual: null,
    content_hash: `hash-${id}`,
    difficulty_level: 1,
    category_id: categoryId(1),
    author_id: authorId(1),
    category: { id: 1, name: 'wisdom' },
    author: { id: 1, name: 'Ibn al-Jawzī' },
    article_sentences: [],
    ...overrides,
  }) as Article;

/** Ordered newest-first, the way `getArticles` returns them. */
const ARTICLES: Article[] = [
  makeArticle(1, {
    title: 'The Discipline of Foresight',
    book: 'Ṣayd al-Khāṭir',
    summary: 'Reason restrains immediate desires to prevent long-term harm.',
  }),
  makeArticle(2, {
    title: 'Resisting Temptation',
    book: 'Ṣayd al-Khāṭir',
    summary: 'The inner struggle against the soul.',
  }),
  makeArticle(3, {
    title: 'Turning Daily Words into Worship',
    book: 'al-Kalim al-Ṭayyib',
    summary: 'Making dhikr into full, meaningful phrases.',
  }),
];

const CORPUS: SearchCorpusSentence[] = [
  {
    article_id: 3,
    position: 1,
    arabic: 'قلّة التَّوْفِيق وَفَسَاد الرَّأْي',
    english: 'Lack of success, distortion of opinion.',
  },
  {
    article_id: 2,
    position: 1,
    arabic: 'والوحشة بَين العَبْد وَبَين ربّه',
    english: 'And estrangement between the servant and their Lord.',
  },
  // Puts "worship" in article 1's BODY, while article 3 carries it in its
  // TITLE — so the ranking test below has two real candidates to order.
  {
    article_id: 1,
    position: 1,
    arabic: 'العبادة',
    english: 'Foresight turns restraint into worship.',
  },
];

describe('useArticleSearch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockArticlesService.getArticles.mockResolvedValue(ARTICLES);
    mockArticlesService.getSearchCorpus.mockResolvedValue(CORPUS);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const { QueryClientProvider } = require('@tanstack/react-query');
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  const search = async (query: string) => {
    const view = renderHook(() => useArticleSearch(query), { wrapper });
    await waitFor(() => expect(view.result.current.isBodyLoading).toBe(false));
    return view;
  };

  test('a query shorter than two characters searches nothing', async () => {
    const { result } = await search('a');

    expect(result.current.hasQuery).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  test('finds an accented book title from a plain-ASCII query', async () => {
    // `ilike '%sayd al-khatir%'` against `Ṣayd al-Khāṭir` returns nothing.
    const { result } = await search('sayd al-khatir');

    expect(result.current.results.map(r => r.article.title)).toEqual([
      'The Discipline of Foresight',
      'Resisting Temptation',
    ]);
  });

  test('finds vocalised body text from an undiacritized Arabic query', async () => {
    // `التوفيق` never appears literally — the sentence spells it `التَّوْفِيق`.
    const { result } = await search('التوفيق');

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0]?.article.title).toBe('Turning Daily Words into Worship');
  });

  test('a body hit carries the sentence that matched, so the row can say why', async () => {
    const { result } = await search('estrangement');

    expect(result.current.results[0]?.bodySnippet).toContain('estrangement');
  });

  test('a catalogue hit carries no snippet', async () => {
    const { result } = await search('foresight');

    expect(result.current.results[0]?.bodySnippet).toBeUndefined();
  });

  test('a title match outranks a summary match', async () => {
    // "Temptation" is this text's title; "restrains" only reaches article 1's
    // summary, so ranking has to put the title hit first when both match.
    const { result } = await search('resisting');

    expect(result.current.results[0]?.article.title).toBe('Resisting Temptation');
  });

  test('title beats body: a word in a title outranks the same word in a sentence', async () => {
    const { result } = await search('worship');

    // Both match: article 3 in its title, article 1 only in a sentence.
    expect(result.current.results.map(r => r.article.title)).toEqual([
      'Turning Daily Words into Worship',
      'The Discipline of Foresight',
    ]);
    expect(result.current.results[0]?.bodySnippet).toBeUndefined();
    expect(result.current.results[1]?.bodySnippet).toContain('worship');
  });

  test('every word must match — the tokens are ANDed, not ORed', async () => {
    const { result } = await search('foresight temptation');

    expect(result.current.results).toEqual([]);
  });

  test('word order does not matter', async () => {
    const forward = await search('sayd khatir');
    const reversed = await search('khatir sayd');

    expect(forward.result.current.results.map(r => r.article.id)).toEqual(
      reversed.result.current.results.map(r => r.article.id),
    );
    expect(forward.result.current.results).not.toHaveLength(0);
  });

  test('words spread across title and book still match', async () => {
    const { result } = await search('khatir foresight');

    expect(result.current.results.map(r => r.article.title)).toEqual([
      'The Discipline of Foresight',
    ]);
  });

  test('a query that matches nothing returns nothing, not everything', async () => {
    const { result } = await search('zzzz');

    expect(result.current.hasQuery).toBe(true);
    expect(result.current.results).toEqual([]);
  });

  test('catalogue results do not wait on the sentence corpus', async () => {
    let releaseCorpus: (value: SearchCorpusSentence[]) => void = () => {};
    mockArticlesService.getSearchCorpus.mockReturnValue(
      new Promise<SearchCorpusSentence[]>(resolve => {
        releaseCorpus = resolve;
      }),
    );

    const { result } = renderHook(() => useArticleSearch('foresight'), { wrapper });

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(result.current.isBodyLoading).toBe(true);

    releaseCorpus(CORPUS);
    await waitFor(() => expect(result.current.isBodyLoading).toBe(false));
  });
});
