import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useEffect, forwardRef, useImperativeHandle, JSX } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ArticleHeader } from '@/components/article/ArticleHeader';
import { RelatedArticlesFooter } from '@/components/article/RelatedArticlesFooter';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import type { ThemeColors } from '../../types/ui/theme.types';

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    height: '100%',
  },
});

export type ArticleContentRef = {
  scrollToSentence: (sentenceId: number) => void;
};

interface ArticleContentProps {
  id: string;
  article: Article;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => React.ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  colors: ThemeColors;
  footerStyle?: AnimatedStyleProp<ViewStyle>;
  otherArticles?: Article[];
  otherCategoryArticles?: Article[];
  renderArticleCard: (articleData: Article) => React.ReactElement;
  currentPlayingSentenceId?: number | null;
  handleArticlePress: (articleId: string, isCompact: boolean) => void;
}

const SENTENCE_ITEM_HEIGHT = 70;
const EMPTY_ARTICLES: Article[] = [];

export const ArticleContent = forwardRef<ArticleContentRef, ArticleContentProps>(
  (
    {
      id,
      article,
      sortedSentences,
      renderSentenceItem,
      handleScroll,
      colors,
      footerStyle,
      otherArticles,
      otherCategoryArticles = EMPTY_ARTICLES,
      currentPlayingSentenceId,
      handleArticlePress,
    }: ArticleContentProps,
    ref
  ): JSX.Element => {
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const flashListRef = useRef<FlashList<Tables<'article_sentences'>>>(null);
    const { scrollToSentence: scrollToSentenceParam } = useLocalSearchParams<{
      scrollToSentence?: string;
      highlightWord?: string;
      wordPosition?: string;
    }>();

    // Expose the scrollToSentence method to the parent component
    useImperativeHandle(
      ref,
      () => ({
        scrollToSentence: (sentenceId: number) => {
          if (sortedSentences) {
            const sentenceIndex = sortedSentences.findIndex(s => s.id === sentenceId);
            if (sentenceIndex !== -1) {
              scrollToIndex(sentenceIndex);
            }
          }
        },
      }),
      [sortedSentences]
    );

    // Helper function to scroll to an index with consistent parameters
    const scrollToIndex = (index: number) => {
      // Add a small delay to ensure the list is rendered
      setTimeout(() => {
        flashListRef.current?.scrollToIndex({
          index: index,
          animated: true,
          viewPosition: 0.3,
          // Push first sentence higher to ensure visibility above the header
          viewOffset:
            index === 0
              ? headerHeight +
                LAYOUT.SPACING.TINY +
                LAYOUT.SPACING.XLARGE +
                LAYOUT.SPACING.XXLARGE +
                LAYOUT.BUTTON.HEIGHT.MEDIUM
              : 0,
        });
      }, 100);
    };

    // Effect to scroll to the specified sentence when the component mounts
    useEffect(() => {
      if (scrollToSentenceParam && sortedSentences) {
        const sentenceIndex = sortedSentences.findIndex(
          s => s.id === parseInt(scrollToSentenceParam)
        );
        if (sentenceIndex !== -1) {
          scrollToIndex(sentenceIndex);
        }
      }
    }, [scrollToSentenceParam, sortedSentences]);

    // Effect to scroll to the currently playing sentence
    useEffect(() => {
      if (currentPlayingSentenceId && sortedSentences) {
        const sentenceIndex = sortedSentences.findIndex(s => s.id === currentPlayingSentenceId);
        if (sentenceIndex !== -1) {
          scrollToIndex(sentenceIndex);
        }
      }
    }, [currentPlayingSentenceId, sortedSentences]);

    return (
      <Animated.View style={styles.flexOne}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View style={styles.listContainer}>
            <FlashList
              key={`article-${id}`}
              ref={flashListRef}
              data={sortedSentences}
              renderItem={renderSentenceItem}
              keyExtractor={item => item.id.toString()}
              estimatedItemSize={SENTENCE_ITEM_HEIGHT}
              style={[styles.content, { backgroundColor: colors.background }]}
              contentContainerStyle={{
                paddingHorizontal: LAYOUT.SPACING.SMALL,
                paddingTop:
                  headerHeight +
                  LAYOUT.SPACING.TINY +
                  LAYOUT.SPACING.XLARGE +
                  LAYOUT.SPACING.XXLARGE * 2.5 +
                  LAYOUT.BUTTON.HEIGHT.MEDIUM,
                paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.SMALL,
              }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              drawDistance={SENTENCE_ITEM_HEIGHT * 10}
              overrideItemLayout={layout => {
                layout.size = SENTENCE_ITEM_HEIGHT + (article?.title ? 150 : 0);
              }}
              estimatedFirstItemOffset={article?.title ? 150 : 0}
              ListHeaderComponent={
                <Animated.View>
                  <ArticleHeader article={article} colors={colors} />
                </Animated.View>
              }
              ListFooterComponent={
                <>
                  {article.source ? (
                    <View
                      style={{
                        paddingHorizontal: LAYOUT.SPACING.SMALL,
                        marginBottom: LAYOUT.SPACING.MEDIUM,
                      }}
                    >
                      <ThemedText type="label" variant="secondary">
                        Source: {capitalizeFirstLetter(article.source)}
                      </ThemedText>
                    </View>
                  ) : null}
                  {otherArticles && otherArticles.length > 0 ? (
                    <Animated.View style={footerStyle}>
                      <RelatedArticlesFooter
                        otherArticles={otherArticles}
                        otherCategoryArticles={otherCategoryArticles || []}
                        article={article}
                        onArticlePress={a => handleArticlePress(String(a.id), true)}
                      />
                    </Animated.View>
                  ) : null}
                </>
              }
            />
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
