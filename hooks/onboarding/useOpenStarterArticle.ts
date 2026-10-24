import { useRouter } from 'expo-router';

import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import { pickStarterArticle } from '@/utils/articleUtils';
import { getArticleRoute } from '@/utils/routeBuilders';

/**
 * Open the text a first-run learner should read first — the welcome intro's
 * final CTA and the Get started checklist's reading rows.
 *
 * Both wrote this by hand: read the catalogue's progress, pick with
 * `pickStarterArticle` (the easiest unread text, falling back to the least
 * read), push it from its first sentence. Nothing happens on an empty catalogue.
 *
 * @returns the handler to call; it reads progress at call time
 */
export function useOpenStarterArticle(articles: Article[]): () => void {
  const router = useRouter();
  const { data: progressMap } = useBulkReadingProgress(articles.map(article => article.id));

  return () => {
    const starter = pickStarterArticle(articles, progressMap);
    if (starter) {
      router.push(getArticleRoute(starter.id, { disableAutoScroll: true }));
    }
  };
}
