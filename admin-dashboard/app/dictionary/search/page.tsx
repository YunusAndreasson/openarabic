import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { searchDictionary } from '@/lib/word-pages';
import { ArticleNav } from '@/components/article-nav';
import { DictionarySearchForm } from '@/components/dictionary-search-form';
import { Footer } from '@/components/footer';
import { SITE_URL } from '@/lib/constants';
import type { Category } from '@/lib/types';

const canonical = `${SITE_URL}/dictionary/search`;

export const metadata: Metadata = {
  title: 'Search the Dictionary | OpenArabic',
  description: 'Search the OpenArabic dictionary by English meaning or Arabic spelling.',
  alternates: { canonical },
  // A filtered view over already-indexed word pages, not original content —
  // crawlable so links pass through, but not itself a landing page to rank.
  robots: { index: false, follow: true },
};

export default async function DictionarySearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q || '').trim();

  const [categoriesResult, results] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    searchDictionary(query),
  ]);

  const categories = (categoriesResult.data as Category[]) || [];

  return (
    <div className="min-h-screen flex flex-col">
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
          <span className="text-foreground">Search</span>
        </nav>

        <header className="border-b border-border/40 pb-8 mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            OpenArabic Dictionary
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Search the dictionary
          </h1>
          <DictionarySearchForm defaultValue={query} autoFocus />
        </header>

        {query === '' ? (
          <p className="text-muted-foreground">
            Type an English meaning or Arabic word above to search.
          </p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground">
            No dictionary entries match &quot;{query}&quot;. Try a different
            word, or{' '}
            <Link href="/dictionary" className="text-foreground hover:underline">
              browse the full A–Z dictionary
            </Link>
            .
          </p>
        ) : (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {results.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={entry.path}
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
      </main>

      <Footer />
    </div>
  );
}
