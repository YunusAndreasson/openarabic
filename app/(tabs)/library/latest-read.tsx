import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import EmptyState from '@common/EmptyState';
import ErrorState from '@common/ErrorState';

import { ThemedView } from '@/components/ThemedView';
import ListArticleItem from '@/components/library/ListArticleItem';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { readingProgressService } from '@/services/readingProgress';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: 0,
  },
});

export default function LatestReadScreen(): JSX.Element {
  const { user } = useAuth();

  const {
    data: latestReadData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['latest-read-articles-detailed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const data = await readingProgressService.getLatestReadArticles(user.id, 10);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds - short cache for real-time updates when reading
    gcTime: 900000, // 15 minutes
  });

  // Extract articles from the data and create proper Article objects
  const articles = useMemo(() => {
    return latestReadData
      .map(item => {
        const article = item.articles;
        if (!article) return null;

        // Create a proper Article object with all required fields
        return {
          ...article,
          // Add required fields that might be missing
          author: { id: article.author_id || 0, name: 'Unknown Author' },
          category: { id: article.category_id || 0, name: 'Unknown Category' },
          difficulty_level: article.difficulty_level || 1,
          created_at: article.created_at || new Date().toISOString(),
          article_sentences: [], // Empty array since we don't have sentence data
          author_id: article.author_id || 0,
          category_id: article.category_id || 0,
        };
      })
      .filter(Boolean);
  }, [latestReadData]);

  const handleArticlePress = useCallback((article: any) => {
    router.push(`/article/${article.id}?headerTitle=${encodeURIComponent(article.title)}`);
  }, []);

  const renderArticle = useCallback(
    (info: { item: any }) => {
      const { item } = info;
      return <ListArticleItem article={item} onPress={() => handleArticlePress(item)} />;
    },
    [handleArticlePress]
  );

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_ARTICLES}
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Loading state - FlashList will handle this */}
          <FlashList
            data={[]}
            renderItem={() => null}
            contentContainerStyle={styles.contentContainer}
          />
        </View>
      </ThemedView>
    );
  }

  if (articles.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          title="No articles read yet"
          description="Start reading articles to see them here"
          icon="book-outline"
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={item => `latest-read-${item.id}`}
        contentContainerStyle={styles.contentContainer}
        ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.SMALL }} />}
        showsVerticalScrollIndicator={false}
        drawDistance={LAYOUT.CARD.HEIGHT.LIST_ITEM * 5}
      />
    </ThemedView>
  );
}
