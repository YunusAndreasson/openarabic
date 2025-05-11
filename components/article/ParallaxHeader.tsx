import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedImage } from '../EnhancedImage';
import { LAYOUT, HEADER_IMAGE_HEIGHT } from '@/constants/layout';
import { DEFAULT_IMAGES } from '@/constants/images';
import { ThemedText } from '../ThemedText';
import { ArticleButtons } from './ArticleButtons';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { formatDifficultyLevel } from '@/services/difficultyLevel';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const PARALLAX_FACTOR = 0.5; // How much slower the image moves (lower = more dramatic)
const BUTTON_ZONE_HEIGHT = 60; // Height of the area reserved for buttons

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
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const imageHeight = HEADER_IMAGE_HEIGHT + topInset;
  const imageSource = article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER;
  const initialBookmarkIcon = isInReadingList ? 'bookmark' : 'bookmark-outline';

  // Create a smoothed version of scrollY for more natural parallax
  // The "worklet" directive ensures this runs on the UI thread
  const smoothScrollY = useDerivedValue(() => {
    'worklet';
    // Apply spring physics for natural, smooth motion with optimized parameters for Reanimated 3
    return withSpring(scrollY.value, {
      damping: 15,
      stiffness: 90,
      mass: 1,
      overshootClamping: false,
      restDisplacementThreshold: 0.01, // More precise rest point detection
      restSpeedThreshold: 0.01, // More precise rest speed detection
    });
  }, [scrollY]); // Adding scrollY as dependency for better reactivity

  // Text colors based on theme
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';
  const textShadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)';

  // Dynamic text styles based on theme
  const dynamicTextStyles = useMemo(
    () => ({
      title: {
        color: textColor,
        textShadowColor,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: isDarkMode ? 4 : 1,
        marginBottom: LAYOUT.SPACING.TINY,
      },
      author: {
        color: textColor,
        textShadowColor,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: isDarkMode ? 3 : 1,
      },
      metadataText: {
        color: textColor,
        textShadowColor,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: isDarkMode ? 2 : 1,
      },
      metadataIcon: {
        color: textColor,
        opacity: 0.9,
        marginRight: LAYOUT.SPACING.TINY,
        textShadowColor,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: isDarkMode ? 2 : 1,
      },
      summary: {
        color: textColor,
        opacity: 0.85,
        textShadowColor,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: isDarkMode ? 3 : 1,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
      },
    }),
    [isDarkMode, textColor, textShadowColor]
  );

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

  // Animated styles for the container with worklet annotation
  const animatedContainerStyle = useAnimatedStyle(() => {
    'worklet';
    // Header collapses to just the buttons height when scrolling
    const height = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.6],
      [imageHeight, BUTTON_ZONE_HEIGHT + topInset],
      Extrapolation.CLAMP
    );

    return {
      height,
    };
  });

  // Animated styles for the parallax image effect with worklet annotation
  const imageAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Calculate parallax factor based on screen dimensions for more natural feel on different devices
    const dynamicParallaxFactor = PARALLAX_FACTOR * (SCREEN_WIDTH / 375); // Normalize for iPhone 8 width

    // Enhanced overscroll handling - increase scale more dramatically when pulling down
    const overscrollFactor = Math.max(0, -smoothScrollY.value / headerHeight) * 0.5;

    const translateY = interpolate(
      smoothScrollY.value,
      [-headerHeight, 0, headerHeight],
      [headerHeight / 2, 0, -headerHeight * dynamicParallaxFactor],
      Extrapolation.CLAMP
    );

    // Enhanced scale that increases more during overscroll (pull-down)
    const scale =
      interpolate(
        smoothScrollY.value,
        [-headerHeight, 0, headerHeight],
        [1.5, 1, 1], // Increased from 1.2 to 1.5 for more prominent overscroll effect
        Extrapolation.CLAMP
      ) + overscrollFactor; // Additional scale during overscroll

    const opacity = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.7],
      [1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
      // Ensure image fills container, even when scaling
      width: '100%',
      height: '100%',
    };
  }, []); // Empty dependency array for pure UI animations

  // Animated styles for content (fades out when scrolling) with worklet annotation
  const contentAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Content fades out more slowly over a longer scroll distance
    const opacity = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.1, headerHeight * 0.6],
      [1, 0.95, 0],
      Extrapolation.CLAMP
    );

    // Smoother upward movement during fade
    const translateY = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.2, headerHeight * 0.6],
      [0, -5, -20],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  }, []); // Empty dependency array for pure UI animations

  // Animated styles for buttons (stay visible and transition nicely) with worklet annotation
  const buttonsAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Shift buttons slightly as we scroll
    const translateY = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.3],
      [0, -5],
      Extrapolation.CLAMP
    );

    // Buttons maintain visibility longer than content
    const opacity = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.7, headerHeight * 0.9],
      [1, 1, 0.9],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  }, []); // Empty dependency array for pure UI animations

  // Generate gradient colors that fade to match the article background color
  const gradientColors = useMemo(() => {
    // Extract the background color from theme colors
    const bgColor = colors.background;

    return [
      'rgba(0,0,0,0)',
      `${bgColor}40`, // 25% opacity
      `${bgColor}D9`, // 85% opacity
      bgColor, // 100% opacity
    ] as const;
  }, [colors.background]);

  // Add animated dark overlay that becomes visible when scrolled with worklet annotation
  const darkOverlayStyle = useAnimatedStyle(() => {
    'worklet';
    // Add a dark overlay that becomes more visible when scrolling
    const opacity = interpolate(
      smoothScrollY.value,
      [0, headerHeight * 0.3, headerHeight * 0.6],
      [0, 0.2, 0.65], // Increase opacity when collapsed
      Extrapolation.CLAMP
    );

    return {
      opacity,
      backgroundColor: 'black',
    };
  }, []); // Empty dependency array for pure UI animations

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Background Image with Parallax */}
      <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
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
      </Animated.View>

      {/* Dark overlay for better contrast when collapsed */}
      <Animated.View style={[styles.overlay, darkOverlayStyle]} pointerEvents="none" />

      {/* Gradient Overlay to integrate content with background */}
      <LinearGradient colors={gradientColors} style={styles.gradient} pointerEvents="none" />

      {/* Buttons at the top - with their own animation */}
      <Animated.View style={[styles.topSection, { marginTop: topInset }, buttonsAnimatedStyle]}>
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

      {/* Main content section - fades out when scrolling */}
      <Animated.View style={[styles.contentSection, contentAnimatedStyle]}>
        {/* Title and author */}
        <View style={styles.titleContainer}>
          <ThemedText
            type="heading1"
            style={dynamicTextStyles.title}
            accessibilityRole="header"
            adjustsFontSizeToFit={!!(article.title && article.title.length > 60)}
            numberOfLines={article.title && article.title.length > 80 ? 3 : 2}
          >
            {article.title}
          </ThemedText>

          {article.author && (
            <ThemedText type="label" variant="subtle" style={dynamicTextStyles.author}>
              {article.author.name}
            </ThemedText>
          )}
        </View>

        {/* Metadata row */}
        <View style={styles.metadataContainer}>
          {/* Category */}
          {article.category && (
            <View style={styles.metadataItem}>
              <Ionicons
                name="folder-outline"
                size={16}
                color={dynamicTextStyles.metadataIcon.color}
                style={dynamicTextStyles.metadataIcon}
              />
              <ThemedText type="caption" style={dynamicTextStyles.metadataText}>
                {capitalizeFirstLetter(article.category.name)}
              </ThemedText>
            </View>
          )}

          {/* Reading Time */}
          <View style={styles.metadataItem}>
            <Ionicons
              name="time-outline"
              size={16}
              color={dynamicTextStyles.metadataIcon.color}
              style={dynamicTextStyles.metadataIcon}
            />
            <ThemedText type="caption" style={dynamicTextStyles.metadataText}>
              {readingTime} min read
            </ThemedText>
          </View>

          {/* Difficulty Level */}
          <View style={styles.metadataItem}>
            <Ionicons
              name="stats-chart-outline"
              size={16}
              color={dynamicTextStyles.metadataIcon.color}
              style={dynamicTextStyles.metadataIcon}
            />
            <ThemedText type="caption" style={dynamicTextStyles.metadataText}>
              {formatDifficultyLevel(article.difficulty_level)}
            </ThemedText>
          </View>
        </View>

        {/* Summary text */}
        {article.summary && (
          <View style={styles.summaryContainer}>
            <ThemedText
              type="body"
              variant="subtle"
              style={dynamicTextStyles.summary}
              numberOfLines={4}
            >
              {article.summary}
            </ThemedText>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    overflow: 'hidden',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#000', // Add background color to prevent transparent gaps
    overflow: 'hidden', // Ensure content doesn't spill out
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topSection: {
    position: 'relative',
    width: '100%',
    zIndex: 10,
    height: BUTTON_ZONE_HEIGHT,
  },
  contentSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    zIndex: 3,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  summaryContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});

export default ParallaxHeader;
