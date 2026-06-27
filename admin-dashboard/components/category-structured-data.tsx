import { generateSlug } from '@/lib/slugify';
import { SITE_URL } from '@/lib/constants';
import type { Article } from '@/lib/types';

interface CategoryStructuredDataProps {
  categoryId: number;
  categoryName: string;
  articles: Article[];
}

/**
 * JSON-LD for a category landing view (CollectionPage + ItemList).
 * Marks the filtered homepage as a real topic collection so it reads as a
 * curated hub rather than a thin duplicate of the homepage.
 */
export function CategoryStructuredData({
  categoryId,
  categoryName,
  articles,
}: CategoryStructuredDataProps) {
  const url = `${SITE_URL}/?category=${categoryId}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryName} Articles`,
    url,
    isPartOf: { '@type': 'WebSite', name: 'OpenArabic', url: SITE_URL },
    about: { '@type': 'Thing', name: categoryName },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.slice(0, 50).map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/read/${generateSlug(article.title, article.id)}`,
        name: article.title,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
