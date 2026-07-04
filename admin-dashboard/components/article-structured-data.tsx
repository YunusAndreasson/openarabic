import type { Database } from '@/lib/database.types';
import { generateSlug } from '@/lib/slugify';
import { authorPath } from '@/lib/author-slug';
import { normalizeImageUrl } from '@/lib/article-utils';
import { SITE_URL } from '@/lib/constants';

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
  const authorUrl = `${SITE_URL}${authorPath({ id: article.author_id, name: authorName })}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.summary,
        image: normalizeImageUrl(article.image_url),
        datePublished: article.created_at,
        dateModified: article.created_at,
        mainEntityOfPage: articleUrl,
        author: {
          '@type': 'Person',
          name: authorName,
          ...(authorUrl ? { url: authorUrl } : {}),
        },
        // Reference the site-wide Organization (defined in SiteStructuredData)
        // so Google consolidates the publisher entity instead of seeing a fresh
        // node per article.
        publisher: { '@id': `${SITE_URL}/#organization` },
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
