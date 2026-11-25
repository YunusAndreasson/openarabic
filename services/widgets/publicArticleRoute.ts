import { loadFirstPage } from '@/services/firstPage';
import type { ArticleId } from '@/types/branded.types';
import { getArticleRoute } from '@/utils/routeBuilders';

export function getPublicWidgetArticleRoute(position?: string, word = false) {
  const page = loadFirstPage();
  const [lineIndex, wordIndex] =
    position && /^\d+\.\d+$/.test(position) ? position.split('.').map(Number) : [];
  const line = lineIndex === undefined ? undefined : page.sentences[lineIndex];
  const occurrence =
    word && wordIndex !== undefined ? line?.words[wordIndex]?.practice?.occurrenceId : undefined;
  return getArticleRoute(page.articleId as ArticleId, {
    sentenceId: line?.sentenceId,
    wordId: occurrence,
    disableAutoScroll: true,
    source: 'word',
  });
}
