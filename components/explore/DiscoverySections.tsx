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
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = LAYOUT.SPACING.SMALL;
const MAX_ARTICLES_PER_SECTION = 8;
const SHORT_ARTICLE_MAX_SENTENCES = 10;
const LONG_ARTICLE_MIN_SENTENCES = 15;
const BEGINNER_MAX_DIFFICULTY = 3;
const ADVANCED_MIN_DIFFICULTY = 4;

interface DiscoverySectionsProps {
  articlesData: Article[];
}

interface SectionConfig {
  key: string;
  title: string;
  articles: Article[];
}

/** Fisher-Yates shuffle, return first `count` items */
function shuffleAndSlice<T>(items: T[], count: number): T[] {
  if (items.length === 0) return [];
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = temp as T;
  }
  return arr.slice(0, count);
}

/**
 * Renders multiple horizontal discovery sections using PlaylistItemCard.
 * Sections: Beginner Friendly, Short Reads, Long Reads, Advanced.
 * Each section self-hides when no matching articles are found.
 */
const DiscoverySectionsComponent: FC<DiscoverySectionsProps> = ({ articlesData }) => {
  const router = useRouter();
  const articleIds = useMemo(() => articlesData.map(a => a.id as ArticleId), [articlesData]);
  const { data: progressMap } = useSafeBulkReadingProgress(articleIds);

  // Filter out completed articles once for all sections
  const unreadArticles = useMemo(() => {
    return articlesData.filter(article => {
      const progressData = progressMap.get(article.id as ArticleId);
      if (!progressData) return true;
      const percentage = calculateProgressPercentage(
        progressData.last_sentence_read,
        progressData.total_sentences,
      );
      return percentage < COMPLETION_THRESHOLD;
    });
  }, [articlesData, progressMap]);

  const sections = useMemo((): SectionConfig[] => {
    if (unreadArticles.length === 0) return [];

    const result: SectionConfig[] = [];

    // Short Reads (< 10 sentences, ~2 min)
    const shortArticles = shuffleAndSlice(
      unreadArticles.filter(
        a =>
          (a.article_sentences?.length ?? 0) > 0 &&
          (a.article_sentences?.length ?? 0) < SHORT_ARTICLE_MAX_SENTENCES,
      ),
      MAX_ARTICLES_PER_SECTION,
    );
    if (shortArticles.length > 0) {
      result.push({
        key: 'short-reads',
        title: STRINGS.SECTION_SHORT_READS,
        articles: shortArticles,
      });
    }

    // Long Reads (>= 15 sentences, ~4+ min)
    const longArticles = shuffleAndSlice(
      unreadArticles.filter(a => (a.article_sentences?.length ?? 0) >= LONG_ARTICLE_MIN_SENTENCES),
      MAX_ARTICLES_PER_SECTION,
    );
    if (longArticles.length > 0) {
      result.push({
        key: 'long-reads',
        title: STRINGS.SECTION_LONG_READS,
        articles: longArticles,
      });
    }

    // Beginner Friendly (difficulty 1-3)
    const beginnerArticles = shuffleAndSlice(
      unreadArticles.filter(a => a.difficulty_level <= BEGINNER_MAX_DIFFICULTY),
      MAX_ARTICLES_PER_SECTION,
    );
    if (beginnerArticles.length > 0) {
      result.push({
        key: 'beginner',
        title: STRINGS.SECTION_BEGINNER_FRIENDLY,
        articles: beginnerArticles,
      });
    }

    // Advanced (difficulty >= 4)
    const advancedArticles = shuffleAndSlice(
      unreadArticles.filter(a => a.difficulty_level >= ADVANCED_MIN_DIFFICULTY),
      MAX_ARTICLES_PER_SECTION,
    );
    if (advancedArticles.length > 0) {
      result.push({
        key: 'advanced',
        title: STRINGS.SECTION_ADVANCED,
        articles: advancedArticles,
      });
    }

    return result;
  }, [unreadArticles]);

  if (sections.length === 0) return null;

  const handleArticlePress = (article: Article) => {
    router.push(getArticleRoute(article.id as ArticleId, article.title, true));
  };

  return (
    <View>
      {sections.map(section => (
        <View key={section.key}>
          <SectionLabel title={section.title} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            snapToAlignment="start"
          >
            {section.articles.map((article, index) => (
              <View
                key={`${section.key}-${article.id}`}
                style={index === 0 ? styles.cardContainerFirst : styles.cardContainer}
              >
                <PlaylistItemCard
                  title={article.title}
                  secondaryText={getArticleMetadataWithoutCategory(article)}
                  imageUrl={generateStorageUrl('images', article.image_url)}
                  articleId={article.id}
                  onPress={() => handleArticlePress(article)}
                  shouldAnimateOnMount={false}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  cardContainerFirst: {
    width: CARD_WIDTH,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginLeft: CARD_SPACING,
  },
});

export const DiscoverySections = memo(DiscoverySectionsComponent);
DiscoverySections.displayName = 'DiscoverySections';
