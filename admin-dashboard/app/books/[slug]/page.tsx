import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BOOKS } from '@/lib/books';
import {
  AL_FAWAID_SAMPLE,
  AL_FAWAID_TOPICS,
  AL_FAWAID_SECTION_COUNT,
} from '@/lib/al-fawaid-content';
import { ArticleNav } from '@/components/article-nav';
import { Footer } from '@/components/footer';
import { SITE_URL } from '@/lib/constants';
import type { Category } from '@/lib/types';

function getBook(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function generateStaticParams() {
  return BOOKS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) return { title: 'Book Not Found - OpenArabic' };

  const canonical = `${SITE_URL}/books/${book.slug}`;
  const title = `${book.title} by ${book.author} — Arabic & English (Free PDF)`;
  const description = `Download ${book.title} (${book.titleArabic}) by ${book.author} as a free bilingual Arabic–English PDF. ${book.description}`;

  return {
    title: `${title} | OpenArabic`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  const categories = (categoriesData as Category[]) || [];

  const canonical = `${SITE_URL}/books/${book.slug}`;
  const bookJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    alternateName: book.titleArabic,
    author: { '@type': 'Person', name: book.author },
    inLanguage: ['ar', 'en'],
    numberOfPages: book.pages,
    url: canonical,
    publisher: { '@id': `${SITE_URL}/#organization` },
    isAccessibleForFree: true,
    workExample: {
      '@type': 'Book',
      bookFormat: 'https://schema.org/EBook',
      encodingFormat: 'application/pdf',
      url: `${SITE_URL}${book.fileUrl}`,
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />
      <ArticleNav categories={categories} selectedCategoryId={null} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{book.title}</span>
        </nav>

        <header className="border-b border-border/40 pb-8 mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Free bilingual book
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground flex flex-wrap items-baseline gap-x-4 gap-y-2">
            {book.title}
            <span lang="ar" dir="rtl" className="font-arabic text-3xl md:text-4xl text-muted-foreground">
              {book.titleArabic}
            </span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            by {book.author}{' '}
            <span lang="ar" dir="rtl" className="font-arabic">
              ({book.authorArabic})
            </span>
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={book.fileUrl}
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/70 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download the free PDF
            </a>
            <span className="text-sm text-muted-foreground">
              {book.pages} pages · {book.fileSizeMb} MB · Arabic &amp; English
            </span>
          </div>
        </header>

        <section className="prose-none space-y-5 text-foreground/90 leading-relaxed">
          <p>
            <span className="font-semibold text-foreground">{book.title}</span>{' '}
            <span lang="ar" dir="rtl" className="font-arabic">
              ({book.titleArabic})
            </span>{' '}
            {book.description}
          </p>
          <p>
            This edition sets the Arabic and English side by side and preserves the
            Arabic word order in the translation, so you can follow the original text
            phrase by phrase — a practical way to read classical Arabic while you are
            still building vocabulary.
          </p>
          <p>
            {book.author}{' '}
            <span lang="ar" dir="rtl" className="font-arabic">
              ({book.authorArabic})
            </span>{' '}
            was a classical scholar whose works on faith and the inner life are still
            widely read today. The PDF is free to download and share.
          </p>
        </section>

        {book.slug === 'al-fawaid' && (
          <>
            {/* A real bilingual sample from the book — unique, on-topic content. */}
            <section className="mt-12">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
                A sample from the book
              </h2>
              <div className="rounded-xl border border-border/60 bg-card p-6 space-y-6">
                {AL_FAWAID_SAMPLE.map((line, i) => (
                  <div key={i}>
                    <p
                      lang="ar"
                      dir="rtl"
                      className="font-arabic text-2xl leading-[1.9] text-right text-foreground"
                    >
                      {line.arabic}
                    </p>
                    <p className="mt-1.5 font-serif text-foreground/75">{line.english}</p>
                  </div>
                ))}
                <p className="pt-2 text-sm text-muted-foreground">
                  Continue reading in the{' '}
                  <a href={book.fileUrl} download className="text-primary hover:underline">
                    free PDF
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* Table of topics — genuine chapter content, keyword-rich for search. */}
            <section className="mt-12">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                What&rsquo;s inside
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {`${book.title} gathers ${AL_FAWAID_SECTION_COUNT} short sections — “benefits” and principles on faith, the heart, and the Qur’an. A selection of what they cover:`}
              </p>
              <ul className="space-y-2.5">
                {AL_FAWAID_TOPICS.map((topic, i) => (
                  <li
                    key={i}
                    className="border-b border-border/20 pb-2.5 text-foreground/90 last:border-b-0"
                  >
                    {topic.english}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <section className="mt-12 rounded-xl border border-border/60 bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-2">
            Read it with translations and audio
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            OpenArabic turns classical texts like this into bilingual reading practice —
            tap any word for its meaning, hear native audio, and remember new vocabulary
            with spaced repetition.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/download-app"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/85 transition-colors"
            >
              Get the app
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border border-border text-foreground hover:bg-muted/50 transition-colors"
            >
              Browse free texts
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
