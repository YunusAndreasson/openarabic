import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { generateSlug } from '@/lib/slugify';
import { authorSlug } from '@/lib/author-slug';
import { getWordPagesForSitemap } from '@/lib/word-pages';
import { SITE_URL as baseUrl } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // Fetch articles (capped at 50k — XML sitemap protocol limit), plus authors,
  // categories, and dictionary entries. Each set is a separate landing-page
  // type that builds topical authority.
  const [articlesResult, authorsResult, categoriesResult, wordPages] =
    await Promise.all([
      supabase
        .from('articles')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .range(0, 49999),
      supabase.from('authors').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      getWordPagesForSitemap(),
    ]);

  const articleUrls = (articlesResult.data || []).map((article) => ({
    // Descriptive slug — must match the canonical URL emitted by /read/[slug].
    url: `${baseUrl}/read/${generateSlug(article.title, article.id)}`,
    lastModified: article.created_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls = (categoriesResult.data || []).map((category) => ({
    url: `${baseUrl}/?category=${category.id}`,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const authorUrls = (authorsResult.data || []).map((author) => ({
    url: `${baseUrl}/author/${authorSlug(author)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  const wordUrls = wordPages.map((word) => ({
    url: `${baseUrl}/word/${word.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/download-app`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/account-deletion`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...categoryUrls,
    ...authorUrls,
    ...articleUrls,
    ...wordUrls,
  ];
}
