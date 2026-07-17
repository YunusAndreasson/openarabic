import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  getDictionaryIndex,
  getDictionaryLetters,
  wordPagePath,
} from '@/lib/word-pages';
import { ArticleNav } from '@/components/article-nav';
import { DictionaryAzNav } from '@/components/dictionary-az-nav';
import { Footer } from '@/components/footer';
import { SITE_URL } from '@/lib/constants';
import type { Category } from '@/lib/types';

/** How many entries the hub links to. Ranked by usage — the pages most worth
 *  concentrating internal-link equity on. */
const HUB_SIZE = 300;

/** Re-scan usage and rebuild the hub at most once a day. */
export const revalidate = 86400;

const canonical = `${SITE_URL}/dictionary`;

export const metadata: Metadata = {
  title: 'Arabic Dictionary — Words with Audio & Example Sentences | OpenArabic',
  description:
    'Browse the OpenArabic dictionary: common Arabic words with their English meanings, native-audio pronunciation, and real example sentences drawn from classical texts.',
  alternates: { canonical },
  openGraph: {
    type: 'website',
    url: canonical,
    title: 'Arabic Dictionary — OpenArabic',
    description:
      'Common Arabic words with English meanings, pronunciation, and example sentences from real texts.',
  },
};

export default async function DictionaryPage() {
  const [categoriesResult, entries, letters] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    getDictionaryIndex(HUB_SIZE),
    getDictionaryLetters(),
  ]);

  const categories = (categoriesResult.data as Category[]) || [];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Arabic Dictionary',
        url: canonical,
        description:
          'A dictionary of Arabic words with English meanings, pronunciation, and example sentences from real texts.',
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'OpenArabic', url: `${SITE_URL}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Dictionary', item: canonical },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ArticleNav categories={categories} selectedCategoryId={null} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Dictionary</span>
        </nav>

        <header className="border-b border-border/40 pb-8 mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            OpenArabic Dictionary
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Arabic Dictionary
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Look up Arabic words with their English meanings, native-audio
            pronunciation, and real example sentences from{' '}
            <Link href="/" className="text-foreground hover:underline">
              classical texts
            </Link>
            . Every entry links to the passages it appears in, so you learn each
            word the way it is actually used.
          </p>
        </header>

        {letters.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Browse every word A–Z
            </h2>
            <DictionaryAzNav letters={letters} />
          </section>
        )}

        {entries.length > 0 && (
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
              Most common words
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={wordPagePath(entry)}
                    className="flex items-baseline justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <span
                      lang="ar"
                      dir="rtl"
                      className="font-arabic text-xl text-foreground"
                    >
                      {entry.letters}
                    </span>
                    <span className="text-sm text-muted-foreground text-right truncate">
                      {entry.meaning}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12 rounded-xl border border-border/60 bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-2">
            Learn Arabic vocabulary in context
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            OpenArabic teaches words through real bilingual reading with native
            audio and spaced-repetition practice.
          </p>
          <Link
            href="/download-app"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/85 transition-colors"
          >
            Get the app
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
