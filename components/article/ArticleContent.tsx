import React, { useRef } from 'react';
import {
  StyleSheet,
  Platform,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { ArticleHeader, RelatedArticlesFooter } from '@/components/article';
import { LAYOUT } from '@/constants/layout';
import { Tables } from '@/types/database.types';

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  sentenceList: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  flexOne: {
    flex: 1,
  },
});

type ArticleContentProps = {
  id: string;
  article: Tables<'articles'>;
  sortedSentences: Tables<'article_sentences'>[];
  renderSentenceItem: ({ item }: { item: Tables<'article_sentences'> }) => React.ReactElement;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  colors: any;
  isDarkMode: boolean;
  footerStyle: any;
  otherArticles?: any[];
  otherCategoryArticles?: any[];
  renderArticleCard: (articleData: any) => React.ReactElement;
};

export const ArticleContent = ({
  id,
  article,
  sortedSentences,
  renderSentenceItem,
  handleScroll,
  colors,
  isDarkMode,
  footerStyle,
  otherArticles,
  otherCategoryArticles = [],
  renderArticleCard,
}: ArticleContentProps) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Tables<'article_sentences'>>>(null);

  return (
    <Animated.View style={[styles.flexOne]}>
      {sortedSentences && sortedSentences.length > 0 && (
        <FlatList
          key={`article-${id}`}
          ref={flatListRef}
          data={sortedSentences}
          renderItem={renderSentenceItem}
          keyExtractor={item => item.id.toString()}
          style={[styles.content, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.sentenceList,
            {
              paddingTop: insets.top + (Platform.OS === 'ios' ? 40 : 30),
              paddingBottom: insets.bottom + 20,
            },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          initialNumToRender={35}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          indicatorStyle={isDarkMode ? 'white' : 'black'}
          contentInsetAdjustmentBehavior="automatic"
          getItemLayout={(_data, index) => ({
            length: 70,
            offset: 70 * index + (article?.title ? 150 : 0),
            index,
          })}
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
      )}
    </Animated.View>
  );
};
