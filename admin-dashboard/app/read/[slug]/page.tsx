import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { ArticleNav } from '@/components/article-nav';
import { ArticleHeader } from '@/components/article-header';
import { ArticleContent } from '@/components/article-content';
import { SentencePair } from '@/components/sentence-pair';
import { RelatedArticles } from '@/components/related-articles';
import { ArticleVocabulary } from '@/components/article-vocabulary';
import { AppDownloadCTA } from '@/components/app-download-cta';
import { ReadingHint } from '@/components/reading-hint';
import { Footer } from '@/components/footer';
import { ReadingProgress } from '@/components/reading-progress';
import { ArticleStructuredData } from '@/components/article-structured-data';
import { generateSlug, parseIdFromSlug } from '@/lib/slugify';
import { detectPlatform } from '@/lib/platform-detection';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type ArticleSentence = Database['public']['Tables']['article_sentences']['Row'];
type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type VocabRoot = Pick<
  Database['public']['Tables']['roots']['Row'],
  'id' | 'letters' | 'meaning'
>;

// Cap the "Key vocabulary" list so an unusually long text doesn't bloat the page.
const MAX_VOCAB_ENTRIES = 150;

const SUPABASE_STORAGE_URL =
  'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images';

// Fetch article by ID — cache() dedupes across generateMetadata + page in the same request
const getArticle = cache(async (articleId: number): Promise<Article | null> => {
  const { data, error } = await supabase
    .from('articles')
    .select('*, authors(name), categories(name)')
    .eq('id', articleId)
    .single();

  if (error) return null;
  return data as Article;
});

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const articleId = parseIdFromSlug(slug);
  const article = await getArticle(articleId);

  if (!article) {
    return { title: 'Article Not Found - OpenArabic' };
  }

  const imageUrl = `${SUPABASE_STORAGE_URL}/${article.image_url}`;
  // Always canonicalize to the descriptive slug so bare-id / stale-title URLs
  // don't split ranking signals across duplicate URLs.
  const canonicalSlug = generateSlug(article.title, article.id);
  const canonicalUrl = `https://openarabic.io/read/${canonicalSlug}`;

  return {
    title: `${article.title} - OpenArabic`,
    description: article.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: article.title,
      description: article.summary,
      type: 'article',
      url: canonicalUrl,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: article.title }],
      publishedTime: article.created_at,
      authors: [article.authors?.name || 'OpenArabic'],
      section: article.categories?.name || 'General',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: [imageUrl],
    },
  };
}

export default async function ArticleReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const articleId = parseIdFromSlug(slug);

  // Parallel data fetching - all requests run simultaneously
  const [article, sentencesResult, categoriesResult, platformInfo] =
    await Promise.all([
      getArticle(articleId),
      supabase
        .from('article_sentences')
        .select('*')
        .eq('article_id', articleId)
        .order('position', { ascending: true }),
      supabase.from('categories').select('*').order('name'),
      detectPlatform(),
    ]);

  // Handle not found
  if (!article) {
    notFound();
  }

  // Consolidate to a single canonical URL: 308-redirect bare-id or stale-title
  // slugs to the descriptive slug used by internal links and the sitemap.
  const canonicalSlug = generateSlug(article.title, article.id);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/read/${canonicalSlug}`);
  }

  const sentences = (sentencesResult.data as ArticleSentence[]) || [];
  const categories = (categoriesResult.data as Category[]) || [];

  // Fetch sentence words and related articles (depend on article data)
  const sentenceIds = sentences.map((s) => s.id);
  const [wordsResult, relatedResult] = await Promise.all([
    sentenceIds.length > 0
      ? supabase
          .from('sentence_words')
          .select('*')
          .in('sentence_id', sentenceIds)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from('articles')
      .select('*, authors(name), categories(name)')
      .eq('category_id', article.category_id)
      .neq('id', articleId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  // Group words by sentence_id
  const sentenceWords: Record<number, SentenceWord[]> = {};
  ((wordsResult.data as SentenceWord[]) || []).forEach((word) => {
    if (!sentenceWords[word.sentence_id]) {
      sentenceWords[word.sentence_id] = [];
    }
    sentenceWords[word.sentence_id].push(word);
  });

  let relatedArticles = (relatedResult.data as Article[]) || [];

  // Backfill the related list with recent articles when the category is sparse,
  // so every article ends with onward internal links.
  if (relatedArticles.length < 3) {
    const excludeIds = [articleId, ...relatedArticles.map((a) => a.id)];
    const { data: more } = await supabase
      .from('articles')
      .select('*, authors(name), categories(name)')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(3 - relatedArticles.length);
    relatedArticles = [...relatedArticles, ...((more as Article[]) || [])];
  }

  // Distinct dictionary entries used in this article, in order of appearance →
  // crawlable "Key vocabulary" links to the per-word dictionary pages.
  const orderedRootIds: number[] = [];
  const seenRootIds = new Set<number>();
  for (const word of (wordsResult.data as SentenceWord[]) || []) {
    if (!seenRootIds.has(word.root_id)) {
      seenRootIds.add(word.root_id);
      orderedRootIds.push(word.root_id);
    }
  }
  const vocabIds = orderedRootIds.slice(0, MAX_VOCAB_ENTRIES);
  const { data: vocabRootsData } = vocabIds.length
    ? await supabase.from('roots').select('id, letters, meaning').in('id', vocabIds)
    : { data: [] as VocabRoot[] };
  const vocabById = new Map(
    ((vocabRootsData as VocabRoot[]) || []).map((r) => [r.id, r]),
  );
  const vocabRoots = vocabIds
    .map((id) => vocabById.get(id))
    .filter(
      (r): r is VocabRoot => !!r && !!r.letters?.trim() && !!r.meaning?.trim(),
    );

  return (
    <div className="min-h-screen">
      {/* JSON-LD Structured Data */}
      <ArticleStructuredData article={article} />

      {/* Reading Progress Bar */}
      <ReadingProgress />

      {/* Header with Categories */}
      <ArticleNav
        categories={categories}
        selectedCategoryId={article.category_id}
      />

      {/* Article Header */}
      <ArticleHeader article={article} />

      {/* Article Content */}
      <ArticleContent>
        <ReadingHint />
        {sentences.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No content available for this article.
          </p>
        ) : (
          sentences.map((sentence, index) => (
            <SentencePair
              key={sentence.id}
              sentence={sentence}
              words={sentenceWords[sentence.id] || []}
              isLast={index === sentences.length - 1}
            />
          ))
        )}
      </ArticleContent>

      {/* Key vocabulary — internal links to per-word dictionary pages */}
      <ArticleVocabulary roots={vocabRoots} />

      {/* App Download CTA - Show on mobile */}
      {platformInfo.isMobile && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <AppDownloadCTA
            platformInfo={platformInfo}
            variant="inline"
            title="Continue learning on the app"
            description="Get bilingual texts with synchronized audio, spaced repetition vocabulary practice, and personalized lessons."
          />
        </div>
      )}

      {/* Related Articles */}
      <RelatedArticles articles={relatedArticles} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
