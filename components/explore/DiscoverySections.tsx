import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, type FC } from 'react';
import { View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { COMPLETION_THRESHOLD } from '@/constants/layout';
import { APP_SESSION_ID } from '@/constants/queries';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { calculateProgressPercentage } from '@/utils/progressUtils';

import { ArticleRail, type ArticleRailItem } from './ArticleRail';

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
  articles: ArticleRailItem[];
}

/**
 * Seeded Fisher-Yates shuffle, return first `count` items.
 * Uses a simple mulberry32 PRNG seeded by APP_SESSION_ID + sectionKey
 * so the order is stable within a session but fresh across app launches.
 */
function seededRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function deduplicateByImageUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(article => {
    if (!article.image_url) return true;
    if (seen.has(article.image_url)) return false;
    seen.add(article.image_url);
    return true;
  });
}

function shuffleAndSlice<T>(items: T[], count: number, sectionSeed: number): T[] {
  if (items.length === 0) return [];
  const rand = seededRandom(sectionSeed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = temp as T;
  }
  return arr.slice(0, count);
}

/**
 * Renders multiple horizontal discovery sections as ArticleRail card rails.
 * Sections: Beginner Friendly, Short Reads, Long Reads, Advanced.
 * Each section self-hides when no matching articles are found.
 */
const DiscoverySectionsComponent: FC<DiscoverySectionsProps> = ({ articlesData }) => {
  const router = useRouter();
  const articleIds = useMemo(() => articlesData.map(a => a.id as ArticleId), [articlesData]);
  const { data: progressMap } = useBulkReadingProgress(articleIds);

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

    // Seed per section: APP_SESSION_ID XOR'd with a unique offset per section
    const baseSeed = APP_SESSION_ID;

    // Beginner Friendly (difficulty 1-3)
    const beginnerArticles = deduplicateByImageUrl(
      shuffleAndSlice(
        unreadArticles.filter(a => a.difficulty_level <= BEGINNER_MAX_DIFFICULTY),
        MAX_ARTICLES_PER_SECTION,
        baseSeed ^ 3,
      ),
    );
    if (beginnerArticles.length > 0) {
      result.push({
        key: 'beginner',
        title: STRINGS.SECTION_BEGINNER_FRIENDLY,
        articles: beginnerArticles.map(article => ({ article })),
      });
    }

    // Short Reads (< 10 sentences, ~2 min)
    const shortArticles = deduplicateByImageUrl(
      shuffleAndSlice(
        unreadArticles.filter(
          a =>
            a.article_sentences.length > 0 &&
            a.article_sentences.length < SHORT_ARTICLE_MAX_SENTENCES,
        ),
        MAX_ARTICLES_PER_SECTION,
        baseSeed ^ 1,
      ),
    );
    if (shortArticles.length > 0) {
      result.push({
        key: 'short-reads',
        title: STRINGS.SECTION_SHORT_READS,
        articles: shortArticles.map(article => ({ article })),
      });
    }

    // Long Reads (>= 15 sentences, ~4+ min)
    const longArticles = deduplicateByImageUrl(
      shuffleAndSlice(
        unreadArticles.filter(a => a.article_sentences.length >= LONG_ARTICLE_MIN_SENTENCES),
        MAX_ARTICLES_PER_SECTION,
        baseSeed ^ 2,
      ),
    );
    if (longArticles.length > 0) {
      result.push({
        key: 'long-reads',
        title: STRINGS.SECTION_LONG_READS,
        articles: longArticles.map(article => ({ article })),
      });
    }

    // Advanced (difficulty >= 4)
    const advancedArticles = deduplicateByImageUrl(
      shuffleAndSlice(
        unreadArticles.filter(a => a.difficulty_level >= ADVANCED_MIN_DIFFICULTY),
        MAX_ARTICLES_PER_SECTION,
        baseSeed ^ 4,
      ),
    );
    if (advancedArticles.length > 0) {
      result.push({
        key: 'advanced',
        title: STRINGS.SECTION_ADVANCED,
        articles: advancedArticles.map(article => ({ article })),
      });
    }

    return result;
  }, [unreadArticles]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      router.push(getArticleRoute(article.id as ArticleId, article.title, true));
    },
    [router],
  );

  if (sections.length === 0) return null;

  return (
    <View>
      {sections.map((section, sectionIndex) => (
        <View key={section.key}>
          <SectionLabel
            title={section.title}
            density={sectionIndex === 0 ? 'comfortable' : 'compact'}
          />
          <ArticleRail
            items={section.articles}
            keyPrefix={section.key}
            onArticlePress={handleArticlePress}
          />
        </View>
      ))}
    </View>
  );
};

export const DiscoverySections = memo(DiscoverySectionsComponent);
DiscoverySections.displayName = 'DiscoverySections';
