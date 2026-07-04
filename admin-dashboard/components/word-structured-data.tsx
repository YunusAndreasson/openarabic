import { wordPagePath } from '@/lib/word-pages';
import { SITE_URL } from '@/lib/constants';
import type { Database } from '@/lib/database.types';

type Root = Database['public']['Tables']['roots']['Row'];

interface WordStructuredDataProps {
  root: Root;
}

/**
 * JSON-LD for a dictionary entry (DefinedTerm + BreadcrumbList).
 * DefinedTerm gives search/AI engines a clean, grounded Arabic→English
 * definition to cite for "meaning of X" queries.
 */
export function WordStructuredData({ root }: WordStructuredDataProps) {
  const url = `${SITE_URL}${wordPagePath(root)}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTerm',
        name: root.letters,
        description: `${root.letters} — ${root.meaning} (Arabic vocabulary)`,
        termCode: String(root.id),
        inLanguage: 'ar',
        url,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: 'OpenArabic Dictionary',
          url: SITE_URL,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Dictionary',
            item: `${SITE_URL}/dictionary`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${root.letters} (${root.meaning})`,
            item: url,
          },
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
