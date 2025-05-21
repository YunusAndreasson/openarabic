import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  JSX,
  useMemo,
  useCallback,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ParallaxHeader } from '@/components/article/ParallaxHeader';
import { ArticleButtons } from '@/components/article/ArticleButtons';
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
  stickyButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  buttonsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});

// Memoized ArticleButtons component to prevent unnecessary re-renders
const MemoizedArticleButtons = React.memo(ArticleButtons);

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
    // Add a ref to track the previous scroll position
    const prevScrollY = useRef(0);

    // Helper function to handle animated scroll events
    const handleAnimatedScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Apply a small damping factor to smooth transitions
        const currentY = event.nativeEvent.contentOffset.y;
        // Use damping when scrolling near the top to reduce flickering
        if (currentY < HEADER_IMAGE_HEIGHT) {
          scrollY.value = prevScrollY.current + (currentY - prevScrollY.current) * 0.6;
        } else {
          scrollY.value = currentY;
        }
        prevScrollY.current = scrollY.value;
        handleScroll(event);
      },
      [scrollY, handleScroll]
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
      [sortedSentences]
    );

    // Helper function to scroll to an index with consistent parameters
    const scrollToIndex = (index: number) => {
      // Add a small delay to ensure the list is rendered
      setTimeout(() => {
        if (!flashListRef.current) return;

        // Temporarily set scroll throttle to a lower value for smoother navigation
        const currentScrollThrottle = 8;

        try {
          flashListRef.current.scrollToIndex({
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
        } catch (error) {
          // Fallback if the index is out of range
          // Try to scroll to the closest visible item
          if (sortedSentences && sortedSentences.length > 0) {
            flashListRef.current.scrollToItem({
              item: sortedSentences[Math.min(index, sortedSentences.length - 1)],
              animated: true,
            });
          }
        }
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

    // Animated style for the sticky buttons header
    const stickyButtonsStyle = useAnimatedStyle(() => {
      const bgOpacity = withTiming(
        interpolate(
          scrollY.value,
          [0, HEADER_IMAGE_HEIGHT * 0.3],
          [0, 0.65], // Slightly reduced from 0.7 for more subtle dark background
          Extrapolation.CLAMP
        ),
        { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) } // More natural easing curve
      );

      return {
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
      };
    }, []);

    // Memoize the header component for better performance
    const headerComponent = useMemo(
      () => (
        <ParallaxHeader
          article={article}
          scrollY={scrollY}
          colors={colors}
          headerHeight={HEADER_IMAGE_HEIGHT}
          topInset={insets.top}
          isDarkMode={!!isDarkMode}
        />
      ),
      [article, scrollY, colors, insets.top, isDarkMode]
    );

    // Memoize the footer component for better performance
    const footerComponent = useMemo(
      () => (
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
      ),
      [article, otherArticles, footerStyle, handleArticlePress]
    );

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
                paddingTop: 0,
                // Slight bottom padding adjustment for better closure
                paddingBottom:
                  LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.MEDIUM,
              }}
              onScroll={handleAnimatedScroll}
              scrollEventThrottle={8} // Increase scroll update frequency for smoother animations
              showsVerticalScrollIndicator={true}
              drawDistance={SENTENCE_ITEM_HEIGHT * 10}
              initialScrollIndex={0}
              persistentScrollbar={true} // Smoother scrolling experience
              overrideItemLayout={layout => {
                layout.size = SENTENCE_ITEM_HEIGHT;
              }}
              estimatedFirstItemOffset={0}
              ListHeaderComponent={headerComponent}
              ListFooterComponent={footerComponent}
            />

            {/* Sticky Buttons Header */}
            <Animated.View
              style={[
                styles.stickyButtonsContainer,
                stickyButtonsStyle,
                { paddingTop: insets.top + LAYOUT.SPACING.TINY }, // Added tiny extra padding for visual balance
              ]}
            >
              <View style={styles.buttonsWrapper}>
                {onBackPress && onBookmarkPress && onPlayPress && (
                  <MemoizedArticleButtons
                    onBackPress={onBackPress}
                    onBookmarkPress={onBookmarkPress}
                    onPlayPress={onPlayPress}
                    isInReadingList={!!isInReadingList}
                    initialBookmarkIcon={isInReadingList ? 'bookmark' : 'bookmark-outline'}
                    isPlaying={!!isPlaying}
                    colors={colors}
                    user={user}
                    isDarkMode={!!isDarkMode}
                  />
                )}
              </View>
            </Animated.View>
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
