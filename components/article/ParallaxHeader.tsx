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
import { Colors } from '@/constants/Colors';
import { ThemedText } from '../ThemedText';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { formatDifficultyLevel } from '@/services/difficultyLevel';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const PARALLAX_FACTOR = 0.5; // How much slower the image moves (lower = more dramatic)

interface ParallaxHeaderProps {
  article: Article;
  scrollY: SharedValue<number>;
  colors: ThemeColors;
  headerHeight: number;
  topInset?: number;
  // Button states - keep for styling calculations
  isDarkMode?: boolean;
}

// Wrap component in React.memo to prevent unnecessary re-renders
export const ParallaxHeader: React.FC<ParallaxHeaderProps> = React.memo(
  ({ article, scrollY, colors, headerHeight, topInset = 0, isDarkMode = false }) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const imageHeight = HEADER_IMAGE_HEIGHT + topInset;
    const imageSource = article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER;

    // Smoother derived value with optimized spring configs
    const smoothScrollY = useDerivedValue(() => {
      'worklet';
      // More responsive spring physics
      return withSpring(scrollY.value, {
        damping: 20, // Increased for faster response
        stiffness: 100, // Increased for faster response
        mass: 0.8, // Reduced for lighter feel
        overshootClamping: false,
        restDisplacementThreshold: 0.005, // More precise
        restSpeedThreshold: 0.005, // More precise
      });
    }, [scrollY]);

    // Text colors based on theme
    const textColor = isDarkMode ? Colors.dark.primary : Colors.light.primary;
    const textShadowColor = isDarkMode ? Colors.dark.textShadowDark : Colors.light.textShadowLight;

    // Dynamic text styles based on theme
    const dynamicTextStyles = useMemo(
      () => ({
        title: {
          color: textColor,
          textShadowColor,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 4 : 1,
          marginBottom: LAYOUT.SPACING.XSMALL, // Slightly reduced for better proximity with author
        },
        author: {
          color: textColor,
          opacity: 0.9, // Slightly reduced opacity to create visual hierarchy
          textShadowColor,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 3 : 1,
          marginBottom: LAYOUT.SPACING.XSMALL, // Added small margin before metadata
        },
        metadataText: {
          color: textColor,
          opacity: 0.8, // Further reduced opacity for tertiary information
          textShadowColor,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 2 : 1,
        },
        metadataIcon: {
          color: textColor,
          opacity: 0.8, // Match opacity with metadata text
          marginRight: LAYOUT.SPACING.TINY,
          textShadowColor,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 2 : 1,
        },
        summary: {
          color: colors.secondaryText,
          textShadowColor,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 3 : 1,
          lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
        },
      }),
      [isDarkMode, textColor, textShadowColor, colors.secondaryText]
    );

    // Memoize the reading time calculation
    const readingTime = useMemo(() => {
      if (!article) return 2;

      if (article.article_sentences?.length) {
        return Math.max(1, Math.ceil(article.article_sentences.length / 10));
      }

      if (article.summary) {
        const wordCount = article.summary.split(/\s+/).length;
        const estimatedSentences = Math.ceil(wordCount / 15);
        return Math.max(1, Math.ceil(estimatedSentences / 10));
      }

      return 2;
    }, [article]);

    // Optimized container animation
    const animatedContainerStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        height: interpolate(
          smoothScrollY.value,
          [0, headerHeight * 0.6],
          [imageHeight, imageHeight * 0.4],
          Extrapolation.CLAMP
        ),
      };
    }, []);

    // Optimized image animation with smoother parallax
    const imageAnimatedStyle = useAnimatedStyle(() => {
      'worklet';
      const dynamicParallaxFactor = PARALLAX_FACTOR * (SCREEN_WIDTH / 375);
      const overscrollEffect = Math.max(0, -smoothScrollY.value / headerHeight) * 0.5;

      const translateYValue = interpolate(
        smoothScrollY.value,
        [-headerHeight, 0, headerHeight],
        [headerHeight / 2, 0, -headerHeight * dynamicParallaxFactor],
        Extrapolation.CLAMP
      );

      // Subtle initial zoom improves focus on the image as a figure element
      const scaleValue =
        interpolate(
          smoothScrollY.value,
          [-headerHeight, 0, headerHeight],
          [1.3, 1.02, 1], // More subtle initial zoom (1.02 instead of 1.05)
          Extrapolation.CLAMP
        ) + overscrollEffect;

      return {
        transform: [{ translateY: translateYValue }, { scale: scaleValue }],
        opacity: interpolate(
          smoothScrollY.value,
          [0, headerHeight * 0.8],
          [1, 0.7],
          Extrapolation.CLAMP
        ),
        width: '100%',
        height: '100%',
      };
    }, []);

    // Optimized content animation
    const contentAnimatedStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        opacity: interpolate(
          smoothScrollY.value,
          [0, headerHeight * 0.1, headerHeight * 0.6],
          [1, 0.95, 0],
          Extrapolation.CLAMP
        ),
        transform: [
          {
            translateY: interpolate(
              smoothScrollY.value,
              [0, headerHeight * 0.2, headerHeight * 0.6],
              [0, -5, -20],
              Extrapolation.CLAMP
            ),
          },
        ],
      };
    }, []);

    // Optimized dark overlay animation
    const darkOverlayStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        opacity: interpolate(
          smoothScrollY.value,
          [0, headerHeight * 0.3, headerHeight * 0.6],
          [0, 0.2, 0.65],
          Extrapolation.CLAMP
        ),
        backgroundColor: Colors.light.black,
      };
    }, []);

    // Gradient colors for smooth transition - refined for better figure-ground separation
    const gradientColors = useMemo(() => {
      const bgColor = colors.background;
      return [
        'rgba(0,0,0,0)',
        'rgba(0,0,0,0.3)', // Slightly reduced for more subtle transition
        `${bgColor}70`, // Adjusted opacity for smoother transition
        `${bgColor}E6`,
        bgColor,
      ] as const;
    }, [colors.background]);

    return (
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        {/* Background Image with Parallax */}
        <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
          <EnhancedImage
            source={imageSource}
            style={styles.image}
            contentFit="cover"
            priority="high"
            blurRadius={0}
            allowDownscaling={false}
            placeholder={
              article.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
            transition={300}
          />
        </Animated.View>

        {/* Dark overlay for better contrast when collapsed */}
        <Animated.View style={[styles.overlay, darkOverlayStyle]} pointerEvents="none" />

        {/* Gradient Overlay to integrate content with background */}
        <LinearGradient colors={gradientColors} style={styles.gradient} pointerEvents="none" />

        {/* Empty space at the top where buttons used to be */}
        <View style={[styles.topSpace, { marginTop: topInset }]} />

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

          {/* Metadata row - grouped for better proximity */}
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

        {/* Divider at the bottom - refined opacity for subtle separation */}
        <View style={styles.divider} />
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.black,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topSpace: {
    width: '100%',
    height: 60,
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
    marginBottom: LAYOUT.SPACING.TINY, // Slightly reduced for better proximity
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.MEDIUM, // Increased to create better separation before summary
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XSMALL, // Reduced for tighter grouping
  },
  summaryContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.divider,
    opacity: 0.1, // Reduced opacity for more subtle separation
    width: '100%',
  },
});

// Add displayName for better debugging
ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
