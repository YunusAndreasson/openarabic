import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ParallaxHeader from '@/components/article/ParallaxHeader';
import { RelatedArticlesFooter } from '@/components/article/RelatedArticlesFooter';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

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
  sourceContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  sourceLabel: {
    fontSize: 14,
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
  handleArticlePress: (articleId: string, isCompact: boolean) => void;
  englishToggleKey?: string;
  isDarkMode?: boolean;
  isInReadingList?: boolean;
  isLoadingReadingList?: boolean;
  onToggleReadingList?: () => void;
  user?: { id: string } | null;
}

const SENTENCE_ITEM_HEIGHT = 70;

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
      handleArticlePress,
      englishToggleKey,
      isDarkMode,
      isInReadingList,
      isLoadingReadingList,
      onToggleReadingList,
      user,
    }: ArticleContentProps,
    ref
  ): JSX.Element => {
    const insets = useSafeAreaInsets();
    const flashListRef = useRef<FlashList<Tables<'article_sentences'>>>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { scrollToSentence: scrollToSentenceParam } = useLocalSearchParams<{
      scrollToSentence?: string;
      highlightWord?: string;
      wordPosition?: string;
    }>();

    // Helper function to handle scroll events
    const handleAnimatedScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        handleScroll(event);
      },
      [handleScroll]
    );

    // Helper function to scroll to an index with consistent parameters
    const scrollToIndex = useCallback(
      (index: number) => {
        // Don't scroll if already scrolling to prevent conflicts
        if (isScrollingRef.current) return;

        isScrollingRef.current = true;

        // Reduce delay for more responsive scrolling
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (!flashListRef.current) {
            isScrollingRef.current = false;
            return;
          }

          try {
            // Use a more conservative offset since header height is now dynamic
            const viewOffset = 200 + LAYOUT.SPACING.SMALL; // Estimated dynamic header height

            flashListRef.current.scrollToIndex({
              index: index,
              animated: true,
              viewPosition: 0.05, // Position sentence very close to top for maximum visibility
              viewOffset: viewOffset,
            });
          } catch {
            // Enhanced fallback with better error handling
            if (sortedSentences && sortedSentences.length > 0) {
              const targetIndex = Math.min(index, sortedSentences.length - 1);
              const fallbackOffset = 200 + LAYOUT.SPACING.SMALL; // Estimated dynamic header height

              flashListRef.current?.scrollToItem({
                item: sortedSentences[targetIndex],
                animated: true,
                viewPosition: 0.05,
                viewOffset: fallbackOffset,
              });
            }
          }

          // Reset scrolling flag after animation completes
          if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
          }
          resetTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
          }, 300);
        }, 50); // Reduced delay for more responsive scrolling
      },
      [sortedSentences, insets.top]
    );

    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }
      };
    }, []);

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

    // Memoize the header component for better performance
    const headerComponent = useMemo(
      () => (
        <ParallaxHeader
          article={article}
          colors={colors}
          isDarkMode={!!isDarkMode}
          isInReadingList={isInReadingList}
          isLoadingReadingList={isLoadingReadingList}
          onToggleReadingList={onToggleReadingList}
          user={user}
        />
      ),
      [
        article,
        colors,
        isDarkMode,
        isInReadingList,
        isLoadingReadingList,
        onToggleReadingList,
        user,
      ]
    );

    // Memoize the footer component for better performance
    const footerComponent = useMemo(
      () => (
        <>
          {/* Source field was removed from database */}
          {otherArticles && otherArticles.length > 0 ? (
            <Animated.View style={footerStyle}>
              <RelatedArticlesFooter
                article={article}
                otherArticles={otherArticles}
                onArticlePress={a => handleArticlePress(String(a.id), true)}
              />
            </Animated.View>
          ) : null}
        </>
      ),
      [article, otherArticles, footerStyle, handleArticlePress]
    );

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
      [sortedSentences, scrollToIndex]
    );

    return (
      <Animated.View style={styles.flexOne}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <View style={styles.listContainer}>
            <FlashList
              key={`article-${id}`}
              ref={flashListRef}
              alwaysBounceVertical={false} // Only bounce when content allows it
              bounces={true} // Re-enable bounce for parallax pull-down effect
              data={sortedSentences}
              drawDistance={SENTENCE_ITEM_HEIGHT * 12} // Increased for better performance
              estimatedFirstItemOffset={0}
              estimatedItemSize={SENTENCE_ITEM_HEIGHT}
              extraData={englishToggleKey}
              getItemType={() => 'sentence'} // Add item type for better optimization
              initialScrollIndex={0}
              keyExtractor={item => item.id.toString()}
              ListFooterComponent={footerComponent}
              ListHeaderComponent={headerComponent}
              overScrollMode="auto" // Allow controlled overscroll for parallax
              persistentScrollbar={true}
              removeClippedSubviews={true} // Improve performance
              renderItem={renderSentenceItem}
              scrollEventThrottle={16} // Standard throttle for natural scrolling feel
              showsVerticalScrollIndicator={true}
              style={[styles.content, { backgroundColor: colors.background }]}
              contentContainerStyle={{
                paddingTop: 0, // Remove padding since ParallaxHeader handles its own layout
                // Slight bottom padding adjustment for better closure
                paddingBottom:
                  LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.MEDIUM,
              }}
              overrideItemLayout={layout => {
                layout.size = SENTENCE_ITEM_HEIGHT;
              }}
              onScroll={handleAnimatedScroll}
            />
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
