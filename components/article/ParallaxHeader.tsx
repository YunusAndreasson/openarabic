import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedImage } from '../EnhancedImage';
import { LAYOUT, HEADER_HEIGHT, HEADER_IMAGE_HEIGHT } from '@/constants/layout';
import { DEFAULT_IMAGES } from '@/constants/images';
import { ThemedText } from '../ThemedText';
import { ArticleButtons } from './ArticleButtons';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { formatDifficultyLevel } from '@/services/difficultyLevel';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PARALLAX_FACTOR = 0.5; // How much slower the image moves (lower = more dramatic)
const BUTTON_ZONE_HEIGHT = 60; // Height of the area reserved for buttons
const BUTTON_SAFETY_MARGIN = 20; // Reduced from 30 to allow more content space

interface ParallaxHeaderProps {
  article: Article;
  scrollY: SharedValue<number>;
  colors: ThemeColors;
  headerHeight: number;
  topInset?: number;
  // Button actions
  onBackPress?: () => void;
  onBookmarkPress?: () => void;
  onPlayPress?: () => void;
  // Button states
  isInReadingList?: boolean;
  isPlaying?: boolean;
  user?: any;
  isDarkMode?: boolean;
}

export const ParallaxHeader: React.FC<ParallaxHeaderProps> = ({
  article,
  scrollY,
  colors,
  headerHeight,
  topInset = 0,
  // Button actions
  onBackPress,
  onBookmarkPress,
  onPlayPress,
  // Button states
  isInReadingList = false,
  isPlaying = false,
  user,
  isDarkMode = false,
}) => {
  const imageHeight = HEADER_IMAGE_HEIGHT + topInset;
  const imageSource = article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER;
  const initialBookmarkIcon = isInReadingList ? 'bookmark' : 'bookmark-outline';

  // Calculate the total button area
  const buttonAreaHeight = BUTTON_ZONE_HEIGHT + topInset;

  // Calculate the content start position (after buttons + safety margin)
  const contentStartPosition = buttonAreaHeight + BUTTON_SAFETY_MARGIN;

  // Calculate reading time based on sentences count or summary length
  const readingTime = useMemo(() => {
    if (!article) return 2;

    // If we have article_sentences array, use its length
    if (article.article_sentences?.length) {
      return Math.max(1, Math.ceil(article.article_sentences.length / 10));
    }

    // Otherwise estimate based on summary length (assuming ~15 words per sentence)
    if (article.summary) {
      const wordCount = article.summary.split(/\s+/).length;
      const estimatedSentences = Math.ceil(wordCount / 15);
      return Math.max(1, Math.ceil(estimatedSentences / 10));
    }

    // Default fallback
    return 2;
  }, [article]);

  // Animated styles for the parallax image container
  const imageContainerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-headerHeight, 0, headerHeight],
      [headerHeight / 2, 0, -headerHeight * PARALLAX_FACTOR],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [-headerHeight, 0, headerHeight],
      [1.2, 1, 1],
      Extrapolation.CLAMP
    );

    // Fade out the image as we scroll
    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight * 0.7],
      [1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  // Animated styles for the main header content
  const headerContentAnimatedStyle = useAnimatedStyle(() => {
    // Fade out the main content completely by the time we're 70% scrolled
    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight * 0.5, headerHeight * 0.7],
      [1, 0.6, 0],
      Extrapolation.CLAMP
    );

    // Move up slightly as we scroll
    const translateY = interpolate(
      scrollY.value,
      [0, headerHeight * 0.5],
      [0, -headerHeight * 0.1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Calculate the maximum height for the header content
  const availableContentHeight = imageHeight - contentStartPosition;

  // Calculate appropriate content distribution
  const contentDistribution = useMemo(() => {
    // If the content area is shorter, use a more compressed layout
    if (availableContentHeight < 240) {
      return {
        paddingBottom: LAYOUT.SPACING.SMALL,
        topSpacing: LAYOUT.SPACING.MEDIUM, // Reduced from XLARGE
        innerSpacing: LAYOUT.SPACING.SMALL,
      };
    }

    // Normal layout for taller content areas
    return {
      paddingBottom: LAYOUT.SPACING.LARGE, // Increased from MEDIUM
      topSpacing: LAYOUT.SPACING.MEDIUM, // Reduced to provide more room for content
      innerSpacing: LAYOUT.SPACING.SMALL, // Keep the same
    };
  }, [availableContentHeight]);

  // Generate gradient colors based on theme
  const gradientColors = React.useMemo(() => {
    return ['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)'] as const;
  }, []);

  // Determine if summary is long to adjust layout
  const isSummaryLong = article.summary && article.summary.length > 80;

  // Ensure summary is visible with appropriate line count
  const summaryLineCount = undefined; // No limit to see full text

  return (
    <View style={[styles.container, { height: imageHeight }]}>
      {/* Parallax Image Background */}
      <Animated.View style={[styles.imageContainer, imageContainerAnimatedStyle]}>
        <EnhancedImage
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          priority="high"
          placeholder={
            article.placeholder || {
              thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
            }
          }
        />
        {/* Single gradient overlay for text readability - only layer of opacity */}
        <LinearGradient colors={gradientColors} style={styles.gradient} pointerEvents="none" />
      </Animated.View>

      {/* Buttons container without animated background */}
      <Animated.View style={[styles.buttonsContainer, { paddingTop: topInset }]}>
        {onBackPress && onBookmarkPress && onPlayPress && (
          <ArticleButtons
            onBackPress={onBackPress}
            onBookmarkPress={onBookmarkPress}
            onPlayPress={onPlayPress}
            isInReadingList={isInReadingList}
            initialBookmarkIcon={initialBookmarkIcon}
            isPlaying={isPlaying}
            colors={colors}
            user={user}
            isDarkMode={isDarkMode}
          />
        )}
      </Animated.View>

      {/* Content container with appropriate spacing from buttons */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            top: contentStartPosition, // Start position after button area + safety margin
            maxHeight: null, // Remove any height constraints
            bottom: 0, // Ensure it extends to the bottom
          },
          headerContentAnimatedStyle,
        ]}
      >
        <View
          style={[
            styles.contentWrapper,
            {
              paddingTop: contentDistribution.topSpacing, // Extra padding at the top
              paddingBottom: contentDistribution.paddingBottom,
            },
          ]}
        >
          <ThemedText
            type="heading1"
            style={styles.title}
            accessibilityRole="header"
            adjustsFontSizeToFit={!!(article.title && article.title.length > 60)}
            numberOfLines={article.title && article.title.length > 80 ? 3 : 2}
          >
            {article.title}
          </ThemedText>

          {article.author && (
            <ThemedText type="label" variant="subtle" style={styles.author}>
              {article.author.name}
            </ThemedText>
          )}

          {/* Article Metadata */}
          <View style={[styles.metadataContainer, { marginTop: contentDistribution.innerSpacing }]}>
            {/* Category */}
            {article.category && (
              <View style={styles.metadataItem}>
                <Ionicons
                  name="folder-outline"
                  size={16}
                  color="#FFFFFF"
                  style={styles.metadataIcon}
                />
                <ThemedText type="caption" style={styles.metadataText}>
                  {capitalizeFirstLetter(article.category.name)}
                </ThemedText>
              </View>
            )}

            {/* Reading Time */}
            <View style={styles.metadataItem}>
              <Ionicons name="time-outline" size={16} color="#FFFFFF" style={styles.metadataIcon} />
              <ThemedText type="caption" style={styles.metadataText}>
                {readingTime} min read
              </ThemedText>
            </View>

            {/* Difficulty Level */}
            <View style={styles.metadataItem}>
              <Ionicons
                name="stats-chart-outline"
                size={16}
                color="#FFFFFF"
                style={styles.metadataIcon}
              />
              <ThemedText type="caption" style={styles.metadataText}>
                {formatDifficultyLevel(article.difficulty_level)}
              </ThemedText>
            </View>
          </View>

          {/* Summary without ellipsis */}
          {article.summary && (
            <ThemedText
              type="body"
              variant="subtle"
              style={styles.summary}
              numberOfLines={summaryLineCount}
            >
              {article.summary}
            </ThemedText>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
    height: HEADER_IMAGE_HEIGHT,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  buttonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Higher than everything else
  },
  contentContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  contentWrapper: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  title: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  author: {
    color: '#FFFFFF',
    marginTop: LAYOUT.SPACING.SMALL,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  metadataIcon: {
    opacity: 0.9,
    marginRight: LAYOUT.SPACING.TINY,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metadataText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  summary: {
    color: '#FFFFFF',
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XLARGE, // Keep large bottom margin
    paddingBottom: LAYOUT.SPACING.MEDIUM, // Add extra padding at bottom
    opacity: 0.85,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default ParallaxHeader;
