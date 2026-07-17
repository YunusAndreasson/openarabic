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
import { SITE_URL } from '@/lib/constants';
import { getWordEnrichment } from '@/lib/word-enrichment';
import type { Category } from '@/lib/types';

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
  const { root, usageCount, examples, related } = entry;
  const enrichment = getWordEnrichment(root.id);

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
          <Link href="/dictionary" className="hover:text-foreground">
            Dictionary
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{root.meaning}</span>
        </nav>

        <header className="border-b border-border/40 pb-8 mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Arabic vocabulary
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span lang="ar" dir="rtl" className="font-arabic">
              {root.letters}
            </span>
            <span className="text-2xl md:text-3xl text-muted-foreground font-semibold">
              {root.meaning} in Arabic
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            <span lang="ar" dir="rtl" className="font-arabic text-foreground">
              {root.letters}
            </span>{' '}
            is how you say{' '}
            <span className="text-foreground">&ldquo;{root.meaning}&rdquo;</span> in Arabic.
            Hear it pronounced and see it used in{' '}
            {usageCount === 1 ? 'a real example sentence' : 'real example sentences'} from
            classical texts below.
          </p>

          {(arabicAudio || englishAudio) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {arabicAudio && <AudioButton src={arabicAudio} label="Arabic" />}
              {englishAudio && <AudioButton src={englishAudio} label="English" />}
            </div>
          )}
        </header>

        {enrichment && (
          <section className="border-b border-border/40 pb-8 mb-8">
            {enrichment.faq.length > 0 && (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: enrichment.faq.map((f) => ({
                      '@type': 'Question',
                      name: f.q,
                      acceptedAnswer: { '@type': 'Answer', text: f.a },
                    })),
                  }),
                }}
              />
            )}

            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-muted-foreground mb-5">
              <span>
                Root{' '}
                <span lang="ar" dir="rtl" className="font-arabic text-base text-foreground">
                  {enrichment.triliteralRoot}
                </span>{' '}
                ({enrichment.rootTransliteration})
              </span>
              <span>{enrichment.partOfSpeech}</span>
              <span>
                Pronounced{' '}
                <span className="text-foreground">{enrichment.headwordTransliteration}</span>
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Meaning of {root.meaning} in Arabic
            </h2>
            <ol className="space-y-3 mb-6">
              {enrichment.senses.map((s, i) => (
                <li key={i} className="text-foreground leading-relaxed">
                  <span className="font-semibold">{s.gloss}</span>
                  {s.note && <span className="text-muted-foreground"> — {s.note}</span>}
                </li>
              ))}
            </ol>

            {enrichment.usageNote && (
              <p className="text-muted-foreground leading-relaxed mb-6">
                {enrichment.usageNote}
              </p>
            )}

            {enrichment.wordFamily.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Words from the same root
                </h3>
                <ul className="flex flex-wrap gap-2.5">
                  {enrichment.wordFamily.map((m, i) => {
                    const inner = (
                      <>
                        <span
                          lang="ar"
                          dir="rtl"
                          className="font-arabic text-lg text-foreground"
                        >
                          {m.letters}
                        </span>
                        <span className="text-sm text-muted-foreground">{m.meaning}</span>
                      </>
                    );
                    return (
                      <li key={i}>
                        {m.path ? (
                          <Link
                            href={m.path}
                            className="inline-flex items-baseline gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <span className="inline-flex items-baseline gap-2 rounded-lg border border-border/40 px-3 py-2">
                            {inner}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {enrichment.faq.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Common questions
                </h3>
                <dl className="space-y-3">
                  {enrichment.faq.map((f, i) => (
                    <div key={i}>
                      <dt className="font-medium text-foreground">{f.q}</dt>
                      <dd className="text-muted-foreground mt-0.5 leading-relaxed">{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              Definitions synthesised from{' '}
              <a
                href={enrichment.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {enrichment.source}
              </a>
              .
            </p>
          </section>
        )}

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
                      className="flex-1 font-arabic text-2xl md:text-[26px] leading-[1.9] text-right text-foreground"
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
                      <span lang="ar" dir="rtl" className="font-arabic font-semibold text-foreground">
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

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
              Related words
            </h2>
            <ul className="flex flex-wrap gap-2.5">
              {related.map((word) => (
                <li key={word.path}>
                  <Link
                    href={word.path}
                    className="inline-flex items-baseline gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <span lang="ar" dir="rtl" className="font-arabic text-lg text-foreground">
                      {word.letters}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {word.meaning}
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
            OpenArabic teaches words like{' '}
            <span lang="ar" dir="rtl" className="font-arabic text-foreground">
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
