import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import type {
  JSX} from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ArticleButtons } from '@/components/article/ArticleButtons';
import { ParallaxHeader } from '@/components/article/ParallaxHeader';
import { RelatedArticlesFooter } from '@/components/article/RelatedArticlesFooter';
import { TextSizeSlider } from '@/components/article/TextSizeSlider';
import { LAYOUT, HEADER_IMAGE_HEIGHT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

import type { ThemeColors } from '../../types/ui/theme.types';

const styles = StyleSheet.create({
  buttonsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
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
  stickyButtonsContainer: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
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
  handleArticlePress: (articleId: string, isCompact: boolean) => void;
  // Button action props
  onBackPress?: () => void;
  onBookmarkPress?: () => void;
  onPlayPress?: () => void;
  onEnglishToggle?: () => void;
  onTextSizeToggle?: () => void;
  // Button state props
  isInReadingList?: boolean;
  isPlaying?: boolean;
  showEnglish?: boolean;
  showTextSizeSlider?: boolean;
  fontScale?: number;
  onFontScaleChange?: (value: number) => void;
  englishToggleKey?: string;
  user?: any;
  isDarkMode?: boolean;
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
      // Button action props
      onBackPress,
      onBookmarkPress,
      onPlayPress,
      onEnglishToggle,
      onTextSizeToggle,
      // Button state props
      isInReadingList,
      isPlaying,
      showEnglish,
      showTextSizeSlider,
      fontScale,
      onFontScaleChange,
      englishToggleKey,
      user,
      isDarkMode,
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

    // Create a shared value to track scroll position for parallax effect
    const scrollY = useSharedValue(0);

    // Helper function to handle animated scroll events
    const handleAnimatedScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = event.nativeEvent.contentOffset.y;
        // Use direct assignment for smoother parallax - no spring damping here
        scrollY.value = currentY;
        handleScroll(event);
      },
      [scrollY, handleScroll]
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
            // The parallax header is always present, so we need to account for it for all sentences
            // Calculate the total header area that needs to be cleared
            const parallaxHeaderHeight = HEADER_IMAGE_HEIGHT;
            const stickyButtonsHeight =
              insets.top + LAYOUT.BUTTON.HEIGHT.MEDIUM + LAYOUT.SPACING.MEDIUM;

            // For all sentences, we need to clear both the parallax header and sticky buttons
            // The first sentence needs extra spacing, others need less
            const baseOffset = parallaxHeaderHeight + stickyButtonsHeight;
            const viewOffset =
              index === 0
                ? baseOffset + LAYOUT.SPACING.LARGE // Extra spacing for first sentence
                : baseOffset + LAYOUT.SPACING.SMALL; // Less spacing for subsequent sentences

            flashListRef.current.scrollToIndex({
              index: index,
              animated: true,
              viewPosition: 0.05, // Position sentence very close to top for maximum visibility
              viewOffset: viewOffset,
            });
          } catch (error) {
            // Enhanced fallback with better error handling
            if (sortedSentences && sortedSentences.length > 0) {
              const targetIndex = Math.min(index, sortedSentences.length - 1);
              const fallbackOffset =
                HEADER_IMAGE_HEIGHT +
                insets.top +
                LAYOUT.BUTTON.HEIGHT.MEDIUM +
                LAYOUT.SPACING.LARGE;

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

    // Animated style for the sticky buttons header
    const stickyButtonsStyle = useAnimatedStyle(() => {
      const bgOpacity = interpolate(
        scrollY.value,
        [0, HEADER_IMAGE_HEIGHT * 0.3],
        [0, 0.65],
        Extrapolation.CLAMP
      );

      return {
        backgroundColor: colors.backdropOverlay.replace(/[\d.]+\)$/, `${bgOpacity})`),
      };
    }, []);

    // Memoize the header component for better performance
    const headerComponent = useMemo(
      () => (
        <ParallaxHeader
          article={article}
          colors={colors}
          headerHeight={HEADER_IMAGE_HEIGHT}
          isDarkMode={!!isDarkMode}
          scrollY={scrollY}
          topInset={insets.top}
        />
      ),
      [article, scrollY, colors, insets.top, isDarkMode]
    );

    // Memoize the footer component for better performance
    const footerComponent = useMemo(
      () => (
        <>
          {/* Source field was removed from database */}
          {false && (
            <View style={styles.sourceContainer}>
              <ThemedText style={[styles.sourceLabel, { color: colors.textSecondary }]}>
                Source: deleted
              </ThemedText>
            </View>
          )}
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
              extraData={`${englishToggleKey}-${fontScale}`}
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
                paddingTop: 0,
                // Slight bottom padding adjustment for better closure
                paddingBottom:
                  LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.MEDIUM,
              }}
              overrideItemLayout={layout => {
                layout.size = SENTENCE_ITEM_HEIGHT;
              }}
              onScroll={handleAnimatedScroll}
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
                {onBackPress &&
                  onBookmarkPress &&
                  onPlayPress &&
                  onEnglishToggle &&
                  onTextSizeToggle && (
                    <MemoizedArticleButtons
                      colors={colors}
                      isDarkMode={!!isDarkMode}
                      isInReadingList={!!isInReadingList}
                      isPlaying={!!isPlaying}
                      showEnglish={!!showEnglish}
                      showTextSizeSlider={!!showTextSizeSlider}
                      user={user}
                      onBackPress={onBackPress}
                      onBookmarkPress={onBookmarkPress}
                      onEnglishToggle={onEnglishToggle}
                      onPlayPress={onPlayPress}
                      onTextSizeToggle={onTextSizeToggle}
                    />
                  )}
              </View>

              {/* Text Size Slider - appears right below buttons */}
              {onTextSizeToggle && fontScale !== undefined && onFontScaleChange && (
                <TextSizeSlider
                  colors={colors}
                  fontScale={fontScale}
                  isDarkMode={!!isDarkMode}
                  isVisible={!!showTextSizeSlider}
                  onFontScaleChange={onFontScaleChange}
                />
              )}
            </Animated.View>
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

ArticleContent.displayName = 'ArticleContent';
