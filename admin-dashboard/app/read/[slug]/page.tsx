'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { PublicHeader } from '@/components/public-header';
import { ArticleHeader } from '@/components/article-header';
import { ArticleContent } from '@/components/article-content';
import { SentencePair } from '@/components/sentence-pair';
import { RelatedArticles } from '@/components/related-articles';
import { Footer } from '@/components/footer';
import { ReadingProgress } from '@/components/reading-progress';
import Link from 'next/link';
import { usePageTitle } from '@/hooks/usePageTitle';
import { parseIdFromSlug } from '@/lib/slugify';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type ArticleSentence = Database['public']['Tables']['article_sentences']['Row'];

type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

type Category = Database['public']['Tables']['categories']['Row'];

export default function ArticleReadPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = parseIdFromSlug(params.slug as string);
  const [isPending, startTransition] = useTransition();

  const [article, setArticle] = useState<Article | null>(null);
  const [sentences, setSentences] = useState<ArticleSentence[]>([]);
  const [sentenceWords, setSentenceWords] = useState<Record<number, SentenceWord[]>>({});
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update page title dynamically based on article
  usePageTitle(article ? `${article.title} - OpenArabic` : 'Reading - OpenArabic');

  useEffect(() => {
    fetchCategories();
    fetchArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch article with author and category
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*, authors(name), categories(name)')
        .eq('id', articleId)
        .single();

      if (articleError) throw articleError;

      // Fetch sentences ordered by position
      const { data: sentencesData, error: sentencesError } = await supabase
        .from('article_sentences')
        .select('*')
        .eq('article_id', articleId)
        .order('position', { ascending: true });

      if (sentencesError) throw sentencesError;

      // Fetch sentence words if sentences exist
      if (sentencesData && sentencesData.length > 0) {
        const sentenceIds = sentencesData.map(s => s.id);
        const { data: wordsData, error: wordsError } = await supabase
          .from('sentence_words')
          .select('*')
          .in('sentence_id', sentenceIds)
          .order('position', { ascending: true });

        if (wordsError) {
          console.error('Error fetching sentence words:', wordsError);
        } else if (wordsData) {
          // Group words by sentence_id
          const wordsBySentence: Record<number, SentenceWord[]> = {};
          wordsData.forEach(word => {
            if (!wordsBySentence[word.sentence_id]) {
              wordsBySentence[word.sentence_id] = [];
            }
            wordsBySentence[word.sentence_id].push(word);
          });
          setSentenceWords(wordsBySentence);
        }
      }

      // Fetch related articles from same category
      if (articleData) {
        const { data: relatedData, error: relatedError } = await supabase
          .from('articles')
          .select('*, authors(name), categories(name)')
          .eq('category_id', articleData.category_id)
          .neq('id', articleId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (relatedError) {
          console.error('Error fetching related articles:', relatedError);
        } else {
          setRelatedArticles((relatedData as Article[]) || []);
        }
      }

      setArticle(articleData as Article);
      setSentences(sentencesData || []);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (categoryId: number | null) => {
    // Navigate to homepage with React 19 transition (non-blocking)
    startTransition(() => {
      router.push('/');
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-2 border-primary animate-pulse-sage" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <p className="text-muted-foreground mb-6">{error || 'The article you are looking for does not exist.'}</p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          ← Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Reading Progress Bar */}
      <ReadingProgress />

      {/* Full Header with Categories */}
      <PublicHeader
        categories={categories}
        selectedCategoryId={article?.category_id || null}
        onSelectCategory={handleSelectCategory}
      />

      {/* Parallax Header */}
      <ArticleHeader article={article} />

      {/* Article Content */}
      <ArticleContent summary={article.summary}>
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

      {/* Related Articles */}
      <RelatedArticles articles={relatedArticles} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
