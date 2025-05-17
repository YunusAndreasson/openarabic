import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useEffect, forwardRef, useImperativeHandle, JSX } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ParallaxHeader } from '@/components/article/ParallaxHeader';
import { RelatedArticlesFooter } from '@/components/article/RelatedArticlesFooter';
import { LAYOUT, HEADER_IMAGE_HEIGHT } from '@/constants/layout';
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
  spacer: {
    height: 60, // Increased from 30 to 60 to add more space for tooltips
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
  // Button action props
  onBackPress?: () => void;
  onBookmarkPress?: () => void;
  onPlayPress?: () => void;
  // Button state props
  isInReadingList?: boolean;
  isPlaying?: boolean;
  user?: any;
  isDarkMode?: boolean;
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
      // Button action props
      onBackPress,
      onBookmarkPress,
      onPlayPress,
      // Button state props
      isInReadingList,
      isPlaying,
      user,
      isDarkMode,
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

    // Create a shared value to track scroll position for parallax effect
    const scrollY = useSharedValue(0);

    // Helper function to handle animated scroll events
    const handleAnimatedScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Update our shared value for parallax effect
      scrollY.value = event.nativeEvent.contentOffset.y;

      // Call the existing scroll handler passed from parent
      handleScroll(event);
    };

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
                paddingTop: HEADER_IMAGE_HEIGHT + LAYOUT.SPACING.XLARGE, // Increased from LARGE to XLARGE
                paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.SMALL,
              }}
              onScroll={handleAnimatedScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              drawDistance={SENTENCE_ITEM_HEIGHT * 10}
              overrideItemLayout={layout => {
                layout.size = SENTENCE_ITEM_HEIGHT;
              }}
              // Remove the offset since we won't have the title header anymore
              estimatedFirstItemOffset={0}
              // Replace the ArticleHeader with just a simple spacer
              ListHeaderComponent={<View style={styles.spacer} />}
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
                        article={article}
                        onArticlePress={a => handleArticlePress(String(a.id), true)}
                      />
                    </Animated.View>
                  ) : null}
                </>
              }
            />

            {/* Parallax Header with integrated buttons */}
            <ParallaxHeader
              article={article}
              scrollY={scrollY}
              colors={colors}
              headerHeight={HEADER_IMAGE_HEIGHT}
              topInset={insets.top}
              // Pass button action props
              onBackPress={onBackPress}
              onBookmarkPress={onBookmarkPress}
              onPlayPress={onPlayPress}
              // Pass button state props
              isInReadingList={isInReadingList}
              isPlaying={isPlaying}
              user={user}
              isDarkMode={isDarkMode}
            />
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
