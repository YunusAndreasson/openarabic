import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { generateSlug } from '@/lib/slugify';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://openarabic.io';

  // Fetch articles for sitemap (capped at 50k — XML sitemap protocol limit)
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .range(0, 49999);

  const articleUrls = (articles || []).map((article) => ({
    // Descriptive slug — must match the canonical URL emitted by /read/[slug].
    url: `${baseUrl}/read/${generateSlug(article.title, article.id)}`,
    lastModified: article.created_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
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
    ...articleUrls,
  ];
}
