import { beforeEach, describe, expect, it, vi } from 'vitest';

type Article = { id: number; title: string; created_at: string };

const rangeMock = vi.fn();
const orderMock = vi.fn(() => ({ range: rangeMock }));
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromMock },
}));

vi.mock('@/lib/word-pages', () => ({
  getWordPagesForSitemap: vi.fn(() => Promise.resolve([{ slug: 'heart-5205' }])),
  getDictionaryLetters: vi.fn(() => Promise.resolve(['a', 'h'])),
}));

const loadSitemap = async () => {
  const mod = await import('./sitemap');
  return mod.default;
};

const setArticles = (articles: Article[]) => {
  rangeMock.mockResolvedValue({ data: articles, error: null });
};

describe('sitemap()', () => {
  beforeEach(() => {
    vi.resetModules();
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockClear();
    rangeMock.mockClear();
  });

  it('caps the article query at the 50k sitemap protocol limit', async () => {
    setArticles([]);
    const sitemap = await loadSitemap();
    await sitemap();
    expect(rangeMock).toHaveBeenCalledWith(0, 49999);
  });

  it('orders articles newest first', async () => {
    setArticles([]);
    const sitemap = await loadSitemap();
    await sitemap();
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('emits the homepage and static legal pages with absolute URLs', async () => {
    setArticles([]);
    const sitemap = await loadSitemap();
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://openarabic.io');
    expect(urls).toContain('https://openarabic.io/privacy');
    expect(urls).toContain('https://openarabic.io/terms');
    expect(urls).toContain('https://openarabic.io/account-deletion');
  });

  it('emits one entry per article using the descriptive slug', async () => {
    setArticles([
      { id: 1, title: 'First', created_at: '2026-01-01T00:00:00Z' },
      { id: 2, title: 'Second', created_at: '2026-02-01T00:00:00Z' },
    ]);
    const sitemap = await loadSitemap();
    const entries = await sitemap();
    const articleUrls = entries
      .map((e) => e.url)
      .filter((u) => u.includes('/read/'));
    expect(articleUrls).toEqual([
      'https://openarabic.io/read/first-1',
      'https://openarabic.io/read/second-2',
    ]);
  });

  it('emits dictionary entries from getWordPagesForSitemap', async () => {
    setArticles([]);
    const sitemap = await loadSitemap();
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toContain(
      'https://openarabic.io/word/heart-5205',
    );
  });

  it('emits an A–Z browse URL per dictionary letter', async () => {
    setArticles([]);
    const sitemap = await loadSitemap();
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://openarabic.io/dictionary/a');
    expect(urls).toContain('https://openarabic.io/dictionary/h');
  });

  it('still returns static pages when the articles query returns null', async () => {
    rangeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const sitemap = await loadSitemap();
    const entries = await sitemap();
    expect(entries.some((e) => e.url === 'https://openarabic.io')).toBe(true);
    expect(entries.every((e) => !e.url.includes('/read/'))).toBe(true);
  });
});
