import type { Database } from '@/lib/database.types';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleStructuredDataProps {
  article: Article;
}

/**
 * JSON-LD Structured Data for Articles
 * Enables rich snippets in Google search results
 */
export function ArticleStructuredData({ article }: ArticleStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    image: `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/${article.image_url}`,
    datePublished: article.created_at,
    dateModified: article.created_at,
    author: {
      '@type': 'Person',
      name: article.authors?.name || 'OpenArabic',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OpenArabic',
      logo: {
        '@type': 'ImageObject',
        url: 'https://openarabic.io/oaLogo.png',
      },
    },
    inLanguage: ['ar', 'en'],
    articleSection: article.categories?.name || 'General',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
