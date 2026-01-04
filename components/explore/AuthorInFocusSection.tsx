import { useRouter } from 'expo-router';
import { memo, useMemo, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { PlaylistItemCard } from '@/components/playlist/PlaylistItemCard';
import { COMPLETION_THRESHOLD, LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutAuthor } from '@/utils/stringUtils';

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = LAYOUT.SPACING.SMALL;
const MAX_ARTICLES = 5;

interface AuthorInFocusSectionProps {
  articlesData: Article[];
}

interface AuthorWithUnreadCount {
  authorId: number;
  authorName: string;
  unreadCount: number;
  articles: Article[];
}

/**
 * "Author in Focus" section that highlights one author.
 *
 * Selection logic (simple, not random):
 * - Pick the author with the most unread articles for this user
 * - This naturally surfaces authors with untapped content
 * - Falls back to author with most articles for users with no progress
 */
const AuthorInFocusSectionComponent: FC<AuthorInFocusSectionProps> = ({ articlesData }) => {
  const router = useRouter();

  // Get all article IDs for bulk progress fetch
  const articleIds = useMemo(
    () => articlesData.map(a => a.id as ArticleId),
    [articlesData],
  );

  // Fetch reading progress for all articles
  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  // Find the author with the most unread articles
  const focusAuthor = useMemo(() => {
    if (articlesData.length === 0) return null;

    // Group articles by author and count unread
    const authorMap = new Map<number, AuthorWithUnreadCount>();

    for (const article of articlesData) {
      const authorId = article.author.id;
      const authorName = article.author.name;

      // Check if article is unread
      const progressData = progressMap.get(article.id as ArticleId);
      const percentage = progressData
        ? calculateProgressPercentage(
            progressData.last_sentence_read,
            progressData.total_sentences,
          )
        : 0;
      const isUnread = percentage < COMPLETION_THRESHOLD;

      // Get or create author entry
      let authorData = authorMap.get(authorId);
      if (!authorData) {
        authorData = {
          authorId,
          authorName,
          unreadCount: 0,
          articles: [],
        };
        authorMap.set(authorId, authorData);
      }

      // Add article and increment unread count
      authorData.articles.push(article);
      if (isUnread) {
        authorData.unreadCount++;
      }
    }

    // Find author with most unread articles (must have at least 2 articles to be featured)
    let bestAuthor: AuthorWithUnreadCount | null = null;
    for (const author of authorMap.values()) {
      if (author.articles.length >= 2) {
        if (!bestAuthor || author.unreadCount > bestAuthor.unreadCount) {
          bestAuthor = author;
        }
      }
    }

    return bestAuthor;
  }, [articlesData, progressMap]);

  // Get unread articles first, then others, limited to MAX_ARTICLES
  // Must be called before any early returns (React hooks rule)
  const displayArticles = useMemo(() => {
    if (!focusAuthor) return [];

    const unread: Article[] = [];
    const read: Article[] = [];

    for (const article of focusAuthor.articles) {
      const progressData = progressMap.get(article.id as ArticleId);
      const percentage = progressData
        ? calculateProgressPercentage(
            progressData.last_sentence_read,
            progressData.total_sentences,
          )
        : 0;

      if (percentage < COMPLETION_THRESHOLD) {
        unread.push(article);
      } else {
        read.push(article);
      }
    }

    return [...unread, ...read].slice(0, MAX_ARTICLES);
  }, [focusAuthor, progressMap]);

  // Don't render if no suitable author found
  if (!focusAuthor || displayArticles.length === 0) {
    return null;
  }

  const handleArticlePress = (article: Article) => {
    router.push(getArticleRoute(article.id as ArticleId, article.title));
  };

  const getProgressForArticle = (articleId: number): number => {
    const progressData = progressMap.get(articleId as ArticleId);
    if (!progressData) return 0;
    return calculateProgressPercentage(
      progressData.last_sentence_read,
      progressData.total_sentences,
    );
  };

  return (
    <View style={styles.container}>
      <SectionLabel title={`${STRINGS.SECTION_AUTHOR_IN_FOCUS}: ${focusAuthor.authorName}`} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {displayArticles.map((article, index) => (
          <View
            key={`focus-author-${article.id}`}
            style={[
              styles.cardContainer,
              { marginLeft: index === 0 ? 0 : CARD_SPACING },
            ]}
          >
            <PlaylistItemCard
              title={article.title}
              secondaryText={getArticleMetadataWithoutAuthor(article)}
              imageUrl={generateStorageUrl('images', article.image_url)}
              articleId={article.id}
              progressPercentage={getProgressForArticle(article.id)}
              onPress={() => handleArticlePress(article)}
              shouldAnimateOnMount={false}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  scrollContent: {
    paddingRight: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
});

export const AuthorInFocusSection = memo(AuthorInFocusSectionComponent);
AuthorInFocusSection.displayName = 'AuthorInFocusSection';
