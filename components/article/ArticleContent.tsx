import React, { useRef } from 'react';
import { StyleSheet, Platform, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

import { ArticleHeader, RelatedArticlesFooter } from '@/components/article';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { Tables } from '@/types/database.types';
import { Article } from '@/types/articles.types';

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

type ArticleContentProps = {
  id: string;
  article: Article;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => React.ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  colors: any;
  isDarkMode: boolean;
  footerStyle: any;
  otherArticles?: Article[];
  otherCategoryArticles?: Article[];
  renderArticleCard: (articleData: Article) => React.ReactElement;
};

const SENTENCE_ITEM_HEIGHT = 70;

export const ArticleContent = ({
  id,
  article,
  sortedSentences,
  renderSentenceItem,
  handleScroll,
  colors,
  footerStyle,
  otherArticles,
  otherCategoryArticles = [],
  renderArticleCard,
}: ArticleContentProps) => {
  const insets = useSafeAreaInsets();
  const flashListRef = useRef<FlashList<Tables<'article_sentences'>>>(null);

  return (
    <Animated.View style={[styles.flexOne]}>
      {sortedSentences && sortedSentences.length > 0 && (
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
              paddingTop: getHeaderHeight(insets) + LAYOUT.SPACING.XXLARGE * 2,
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
              otherArticles && otherArticles.length > 0 ? (
                <Animated.View style={footerStyle}>
                  <RelatedArticlesFooter
                    otherArticles={otherArticles}
                    otherCategoryArticles={otherCategoryArticles || []}
                    article={article}
                    renderArticleCard={renderArticleCard}
                  />
                </Animated.View>
              ) : null
            }
          />
        </View>
      )}
    </Animated.View>
  );
};
