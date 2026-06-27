import { SITE_URL, authorPath } from '@/lib/authors';
import { getAuthorUrl } from '@/lib/author-links';
import { generateSlug } from '@/lib/slugify';
import type { Article, Author } from '@/lib/types';

interface AuthorStructuredDataProps {
  author: Author;
  articles: Article[];
}

/**
 * JSON-LD for an author hub (ProfilePage + Person + ItemList of their work).
 * Strengthens the author as an entity — an E-E-A-T signal search and AI engines
 * use to attribute and trust the content.
 */
export function AuthorStructuredData({ author, articles }: AuthorStructuredDataProps) {
  const url = `${SITE_URL}${authorPath(author)}`;
  const sameAs = getAuthorUrl(author.name);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        url,
        mainEntity: {
          '@type': 'Person',
          name: author.name,
          url,
          ...(sameAs ? { sameAs: [sameAs] } : {}),
          worksFor: { '@type': 'Organization', name: 'OpenArabic', url: SITE_URL },
        },
      },
      {
        '@type': 'ItemList',
        itemListElement: articles.slice(0, 50).map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/read/${generateSlug(article.title, article.id)}`,
          name: article.title,
        })),
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
