import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getAllDictionaryEntries,
  wordPagePath,
  DICTIONARY_BUCKETS,
} from '@/lib/word-pages';
import { ArticleNav } from '@/components/article-nav';
import { DictionaryAzNav } from '@/components/dictionary-az-nav';
import { Footer } from '@/components/footer';
import { SITE_URL } from '@/lib/constants';
import type { Category } from '@/lib/types';

/** Rebuild each letter page at most once a day (ISR). Generated on demand — the
 *  sitemap drives the initial crawl, then the result is cached. */
export const revalidate = 86400;

function bucketLabel(bucket: string): string {
  if (bucket === '0-9') return '0–9';
  if (bucket === 'other') return 'Other';
  return bucket.toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ letter: string }>;
}): Promise<Metadata> {
  const { letter } = await params;
  if (!DICTIONARY_BUCKETS.includes(letter)) {
    return { title: 'Not Found — OpenArabic' };
  }

  const label = bucketLabel(letter);
  const canonical = `${SITE_URL}/dictionary/${letter}`;

  return {
    title: `Arabic words starting with ${label} | OpenArabic Dictionary`,
    description: `Arabic words whose English meaning starts with ${label} — each with native-audio pronunciation and real example sentences from classical texts. Browse the OpenArabic dictionary A–Z.`,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: `Arabic words — ${label} | OpenArabic Dictionary`,
      description: `Arabic words starting with ${label}, with pronunciation and example sentences.`,
    },
  };
}

export default async function DictionaryLetterPage({
  params,
}: {
  params: Promise<{ letter: string }>;
}) {
  const { letter } = await params;
  if (!DICTIONARY_BUCKETS.includes(letter)) notFound();

  const [categoriesResult, allEntries] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    getAllDictionaryEntries(),
  ]);

  const categories = (categoriesResult.data as Category[]) || [];
  const entries = allEntries.filter((e) => e.bucket === letter);
  if (entries.length === 0) notFound();

  const present = new Set(allEntries.map((e) => e.bucket));
  const presentLetters = DICTIONARY_BUCKETS.filter((b) => present.has(b));
  const label = bucketLabel(letter);
  const canonical = `${SITE_URL}/dictionary/${letter}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `Arabic words starting with ${label}`,
        url: canonical,
        inLanguage: 'en',
        isPartOf: {
          '@type': 'CollectionPage',
          name: 'Arabic Dictionary',
          url: `${SITE_URL}/dictionary`,
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
          { '@type': 'ListItem', position: 3, name: label, item: canonical },
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
          <Link href="/dictionary" className="hover:text-foreground">
            Dictionary
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{label}</span>
        </nav>

        <header className="border-b border-border/40 pb-8 mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            OpenArabic Dictionary
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Arabic words starting with {label}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            {entries.length} {entries.length === 1 ? 'word' : 'words'} whose
            English meaning starts with {label}. Each links to its Arabic
            spelling, native-audio pronunciation, and real example sentences.
          </p>
        </header>

        <div className="mb-8">
          <DictionaryAzNav letters={presentLetters} active={letter} />
        </div>

        <section>
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

        <section className="mt-12 rounded-xl border border-border/60 bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-2">
            Learn Arabic vocabulary in context
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            OpenArabic teaches these words through real bilingual reading with
            native audio and spaced-repetition practice.
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
