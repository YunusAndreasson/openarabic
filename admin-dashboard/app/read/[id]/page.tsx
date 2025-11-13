'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { ArticleHeader } from '@/components/article-header';
import { ArticleContent } from '@/components/article-content';
import { SentencePair } from '@/components/sentence-pair';
import { Footer } from '@/components/footer';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type ArticleSentence = Database['public']['Tables']['article_sentences']['Row'];

export default function ArticleReadPage() {
  const params = useParams();
  const articleId = parseInt(params.id as string);

  const [article, setArticle] = useState<Article | null>(null);
  const [sentences, setSentences] = useState<ArticleSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

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

      setArticle(articleData as Article);
      setSentences(sentencesData || []);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              isLast={index === sentences.length - 1}
            />
          ))
        )}
      </ArticleContent>

      {/* Back to Articles Link */}
      <div className="max-w-3xl mx-auto px-6 md:px-8 pb-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to all articles
        </Link>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
