import type { Database } from '@/lib/database.types';
import { generateSlug } from '@/lib/slugify';
import { getAuthorUrl } from '@/lib/author-links';

const SITE_URL = 'https://openarabic.io';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleStructuredDataProps {
  article: Article;
}

/**
 * JSON-LD Structured Data for Articles (Article + BreadcrumbList).
 * Enables rich snippets and a breadcrumb trail in Google search results.
 */
export function ArticleStructuredData({ article }: ArticleStructuredDataProps) {
  const articleUrl = `${SITE_URL}/read/${generateSlug(article.title, article.id)}`;
  const categoryName = article.categories?.name || 'General';
  const authorName = article.authors?.name || 'OpenArabic';
  const authorUrl = getAuthorUrl(authorName);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.summary,
        image: `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/${article.image_url}`,
        datePublished: article.created_at,
        dateModified: article.created_at,
        mainEntityOfPage: articleUrl,
        author: {
          '@type': 'Person',
          name: authorName,
          ...(authorUrl ? { url: authorUrl } : {}),
        },
        publisher: {
          '@type': 'Organization',
          name: 'OpenArabic',
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/oaLogo.png`,
          },
        },
        inLanguage: ['ar', 'en'],
        articleSection: categoryName,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: categoryName,
            item: `${SITE_URL}/?category=${article.category_id}`,
          },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
