import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getWordEntry,
  parseWordId,
  wordPageSlug,
  wordPagePath,
  rootAudioUrl,
} from '@/lib/word-pages';
import { ArticleNav } from '@/components/article-nav';
import { WordStructuredData } from '@/components/word-structured-data';
import { AudioButton } from '@/components/audio-button';
import { HighlightedArabic } from '@/components/highlighted-arabic';
import { Footer } from '@/components/footer';
import type { Category } from '@/lib/types';

const SITE_URL = 'https://openarabic.io';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rootId = parseWordId(slug);
  const entry = rootId ? await getWordEntry(rootId) : null;

  if (!entry) return { title: 'Word Not Found - OpenArabic' };

  const { root } = entry;
  const canonical = `${SITE_URL}${wordPagePath(root)}`;

  return {
    title: `${root.meaning} in Arabic — ${root.letters} | OpenArabic`,
    description: `${root.letters} means "${root.meaning}" in Arabic. Hear the pronunciation and see it used in real example sentences with grammar notes.`,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: `${root.meaning} in Arabic — ${root.letters}`,
      description: `Meaning, pronunciation, and example sentences for ${root.letters} ("${root.meaning}").`,
    },
  };
}

export default async function WordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rootId = parseWordId(slug);
  if (!rootId) notFound();

  const [entry, categoriesResult] = await Promise.all([
    getWordEntry(rootId),
    supabase.from('categories').select('*').order('name'),
  ]);

  if (!entry) notFound();
  const { root, usageCount, examples } = entry;

  // Consolidate to a single canonical URL — 308-redirect stale-meaning slugs.
  const canonicalSlug = wordPageSlug(root);
  if (slug !== canonicalSlug) permanentRedirect(wordPagePath(root));

  const categories = (categoriesResult.data as Category[]) || [];
  const arabicAudio = rootAudioUrl(root.audio_url);
  const englishAudio = rootAudioUrl(root.audio_url_en);

  return (
    <div className="min-h-screen flex flex-col">
      <WordStructuredData root={root} />
      <ArticleNav categories={categories} selectedCategoryId={null} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Dictionary</span>
        </nav>

        <header className="border-b border-border/40 pb-8 mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Arabic vocabulary
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span lang="ar" dir="rtl">
              {root.letters}
            </span>
            <span className="text-2xl md:text-3xl text-muted-foreground font-semibold">
              {root.meaning}
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            How to say <span className="text-foreground">&ldquo;{root.meaning}&rdquo;</span> in
            Arabic, with pronunciation and{' '}
            {usageCount === 1 ? 'an example' : 'real example sentences'} from
            OpenArabic texts.
          </p>

          {(arabicAudio || englishAudio) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {arabicAudio && <AudioButton src={arabicAudio} label="Arabic" />}
              {englishAudio && <AudioButton src={englishAudio} label="English" />}
            </div>
          )}
        </header>

        {examples.length > 0 && (
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
              Example sentences
            </h2>
            <ul className="space-y-8">
              {examples.map((ex, i) => (
                <li key={i} className="border-b border-border/30 pb-8 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <p
                      lang="ar"
                      dir="rtl"
                      className="flex-1 text-2xl md:text-[26px] leading-[1.9] text-right text-foreground"
                    >
                      <HighlightedArabic
                        text={ex.sentenceArabic}
                        highlight={ex.wordForm}
                      />
                    </p>
                    {ex.sentenceAudio && (
                      <AudioButton src={ex.sentenceAudio} className="mt-1" />
                    )}
                  </div>
                  <p className="mt-2 text-lg font-serif text-foreground/75">
                    {ex.sentenceEnglish}
                  </p>
                  {ex.grammarNote && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      <span lang="ar" dir="rtl" className="font-semibold text-foreground">
                        {ex.wordForm}
                      </span>{' '}
                      — {ex.english}. {ex.grammarNote}
                    </p>
                  )}
                  <Link
                    href={`/read/${ex.articleSlug}`}
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    From: {ex.articleTitle} →
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
            OpenArabic teaches words like{' '}
            <span lang="ar" dir="rtl" className="text-foreground">
              {root.letters}
            </span>{' '}
            through real bilingual reading with native audio and spaced-repetition
            practice.
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
