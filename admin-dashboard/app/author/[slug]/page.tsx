import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getAuthorWithArticles,
  parseAuthorId,
  authorSlug,
  authorPath,
  SITE_URL,
} from '@/lib/authors';
import { getAuthorUrl } from '@/lib/author-links';
import { ArticleNav } from '@/components/article-nav';
import { ArticleGrid } from '@/components/article-grid';
import { AuthorStructuredData } from '@/components/author-structured-data';
import { Footer } from '@/components/footer';
import type { Category } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const authorId = parseAuthorId(slug);
  const data = authorId ? await getAuthorWithArticles(authorId) : null;

  if (!data) return { title: 'Author Not Found - OpenArabic' };

  const { author, articles } = data;
  const canonical = `${SITE_URL}${authorPath(author)}`;

  return {
    title: `Articles by ${author.name} - OpenArabic`,
    description: `Read ${articles.length} Arabic ${
      articles.length === 1 ? 'article' : 'articles'
    } by ${author.name} on OpenArabic — bilingual texts with parallel English translations, native audio, and tap-to-translate vocabulary.`,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      title: `Articles by ${author.name}`,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const authorId = parseAuthorId(slug);
  if (!authorId) notFound();

  const [data, categoriesResult] = await Promise.all([
    getAuthorWithArticles(authorId),
    supabase.from('categories').select('*').order('name'),
  ]);

  if (!data) notFound();
  const { author, articles } = data;

  // Consolidate to a single canonical URL — 308-redirect stale-name slugs.
  const canonicalSlug = authorSlug(author);
  if (slug !== canonicalSlug) permanentRedirect(authorPath(author));

  const categories = (categoriesResult.data as Category[]) || [];
  const externalUrl = getAuthorUrl(author.name);
  const initials =
    author.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorStructuredData author={author} articles={articles} />
      <ArticleNav categories={categories} selectedCategoryId={null} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <header className="mb-10 md:mb-12 flex items-center gap-5 border-b border-border/40 pb-8">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/20 md:h-20 md:w-20 md:text-2xl"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">Author</p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {author.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'} on
              OpenArabic
              {externalUrl && (
                <>
                  {' · '}
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Website
                  </a>
                </>
              )}
            </p>
          </div>
        </header>

        <ArticleGrid articles={articles} />
      </main>

      <Footer />
    </div>
  );
}
