import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
  useDerivedValue,
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

const PARALLAX_FACTOR = 0.35; // Further refined for optimal parallax feel
const CONTENT_FADE_THRESHOLD = 0.4; // Earlier fade for better UX
const OVERLAY_MAX_OPACITY = 0.45; // Increased for better text contrast

// Advanced motion design constants
const MOTION_CONFIG = {
  OPACITY_CURVE: [1, 0.85, 0.3], // Refined opacity curve for smooth transitions
} as const;

// Typography scale refinements for better hierarchy
const TYPOGRAPHY_REFINEMENTS = {
  TITLE: {
    letterSpacing: Platform.OS === 'ios' ? -0.6 : -0.4, // Platform-specific optimization
    lineHeight: Platform.OS === 'ios' ? 0.95 : 0.98, // Tighter line height for impact
  },
  AUTHOR: {
    letterSpacing: Platform.OS === 'ios' ? 0.3 : 0.2,
    opacity: 0.88, // Slightly higher for better readability
  },
  METADATA: {
    letterSpacing: Platform.OS === 'ios' ? 0.4 : 0.3,
    opacity: 0.78, // Optimized for tertiary information
  },
  SUMMARY: {
    letterSpacing: 0.15, // Refined for body text
    opacity: 0.92, // High opacity for content importance
  },
} as const;

// Accessibility and contrast improvements
const ACCESSIBILITY_CONFIG = {
  TEXT_SHADOW: {
    LIGHT: {
      offset: { width: 0, height: 2 },
      radius: 4,
      color: 'rgba(42, 52, 65, 0.4)', // Use theme primary color for shadows
    },
    DARK: {
      offset: { width: 0, height: 2 },
      radius: 6,
      color: 'rgba(0, 0, 0, 0.7)', // Darker shadow for dark mode
    },
  },
  CONTRAST_OVERLAY: {
    LIGHT: 'rgba(42, 52, 65, 0.25)', // Use theme primary for overlay
    DARK: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

interface ParallaxHeaderProps {
  article: Article;
  scrollY: SharedValue<number>;
  colors: ThemeColors;
  headerHeight: number;
  topInset?: number;
  isDarkMode?: boolean;
}

// Enhanced memo comparison for better performance
export const ParallaxHeader: React.FC<ParallaxHeaderProps> = React.memo(
  ({ article, scrollY, colors, headerHeight, topInset = 0, isDarkMode = false }) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    // Memoize expensive calculations that don't change during scroll
    const staticValues = useMemo(() => {
      const imageHeight = HEADER_IMAGE_HEIGHT + topInset;
      const imageSource = article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER;
      const dynamicParallaxFactor = PARALLAX_FACTOR * (SCREEN_WIDTH / 375);

      // Pre-calculate interpolation ranges to avoid repeated calculations in worklets
      const containerHeightRange = [imageHeight, imageHeight * 0.6, imageHeight * 0.25];
      const imageTranslateRange = [headerHeight * 0.08, 0, -headerHeight * dynamicParallaxFactor];
      const imageScaleRange = [1.05, 1.0, 0.98];
      const overlayOpacityRange = [0, OVERLAY_MAX_OPACITY * 0.5, OVERLAY_MAX_OPACITY];

      return {
        imageHeight,
        imageSource,
        dynamicParallaxFactor,
        containerHeightRange,
        imageTranslateRange,
        imageScaleRange,
        overlayOpacityRange,
      };
    }, [SCREEN_WIDTH, headerHeight, topInset, article.image_url]);

    // Advanced spring physics with motion design principles
    const smoothScrollY = useDerivedValue(() => {
      'worklet';
      return scrollY.value; // Use direct scroll value for natural scrolling
    }, [scrollY]);

    // Enhanced text colors with better accessibility - memoized
    const textColor = useMemo(() => colors.primary, [colors.primary]);
    const contrastOverlay = useMemo(
      () =>
        isDarkMode
          ? ACCESSIBILITY_CONFIG.CONTRAST_OVERLAY.DARK
          : ACCESSIBILITY_CONFIG.CONTRAST_OVERLAY.LIGHT,
      [isDarkMode]
    );

    // Dynamic text styles with enhanced hierarchy and accessibility
    const dynamicTextStyles = useMemo(
      () => ({
        title: {
          color: textColor,
          marginBottom: LAYOUT.SPACING.TINY, // Tighter spacing to author
          fontWeight: '700' as const,
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, // Reduced from HUGE (30px) to XXLARGE (24px) for better hierarchy
          letterSpacing: TYPOGRAPHY_REFINEMENTS.TITLE.letterSpacing,
          lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * TYPOGRAPHY_REFINEMENTS.TITLE.lineHeight,
          // Enhanced accessibility
          textShadowColor: ACCESSIBILITY_CONFIG.TEXT_SHADOW[isDarkMode ? 'DARK' : 'LIGHT'].color,
          textShadowOffset: ACCESSIBILITY_CONFIG.TEXT_SHADOW[isDarkMode ? 'DARK' : 'LIGHT'].offset,
          textShadowRadius: ACCESSIBILITY_CONFIG.TEXT_SHADOW[isDarkMode ? 'DARK' : 'LIGHT'].radius,
        },
        author: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.AUTHOR.opacity,
          marginBottom: LAYOUT.SPACING.MEDIUM, // Increased spacing to separate from metadata
          fontWeight: '500' as const, // Reduced from 600 for better hierarchy
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // Increased from SMALL (12px) to MEDIUM (15px)
          letterSpacing: TYPOGRAPHY_REFINEMENTS.AUTHOR.letterSpacing,
          textShadowColor: ACCESSIBILITY_CONFIG.TEXT_SHADOW[isDarkMode ? 'DARK' : 'LIGHT'].color,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 4 : 2,
        },
        metadataText: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.METADATA.opacity,
          fontWeight: '500' as const,
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // Explicit size for consistency
          letterSpacing: TYPOGRAPHY_REFINEMENTS.METADATA.letterSpacing,
          textShadowColor: ACCESSIBILITY_CONFIG.TEXT_SHADOW[isDarkMode ? 'DARK' : 'LIGHT'].color,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 3 : 2,
        },
        metadataIcon: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.METADATA.opacity,
          marginRight: LAYOUT.SPACING.TINY,
        },
        summary: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.SUMMARY.opacity,
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // Explicit size
          lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
          letterSpacing: TYPOGRAPHY_REFINEMENTS.SUMMARY.letterSpacing,
          textShadowColor: ACCESSIBILITY_CONFIG.TEXT_SHADOW[isDarkMode ? 'DARK' : 'LIGHT'].color,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isDarkMode ? 4 : 2,
        },
      }),
      [isDarkMode, textColor]
    );

    // Intelligent reading time calculation with better accuracy
    const readingTime = useMemo(() => {
      if (!article) return 2;

      // More accurate calculation based on content type
      if (article.article_sentences?.length) {
        const wordCount = article.article_sentences.reduce((total, sentence) => {
          // Estimate words from sentence length (more accurate than fixed ratio)
          const estimatedWords = Math.ceil((sentence.english?.length || 0) / 5);
          return total + estimatedWords;
        }, 0);
        return Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM reading speed
      }

      if (article.summary) {
        const wordCount = article.summary.split(/\s+/).filter(word => word.length > 0).length;
        return Math.max(1, Math.ceil(wordCount / 200));
      }

      return 2;
    }, [article]);

    // Optimized container animation - reduced dependency array
    const animatedContainerStyle = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;

      return {
        height: interpolate(
          progress,
          [0, 0.4, 0.8], // Multi-point interpolation for smoother transitions
          staticValues.containerHeightRange,
          Extrapolation.CLAMP
        ),
      };
    }, [headerHeight]); // Removed imageHeight from deps since it's in staticValues

    // Optimized image animation - consolidated interpolations
    const imageAnimatedStyle = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;
      const scrollValue = smoothScrollY.value;

      const translateY = interpolate(
        scrollValue,
        [-headerHeight * 0.2, 0, headerHeight * 0.8], // Reduced negative range for less aggressive pull-down
        staticValues.imageTranslateRange,
        Extrapolation.CLAMP
      );

      const scale = interpolate(
        scrollValue,
        [-headerHeight * 0.2, 0, headerHeight * 0.5], // Reduced range
        staticValues.imageScaleRange,
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        progress,
        [0, 0.6, 1],
        MOTION_CONFIG.OPACITY_CURVE,
        Extrapolation.CLAMP
      );

      return {
        transform: [{ translateY }, { scale }],
        opacity,
      };
    }, [headerHeight]); // Removed SCREEN_WIDTH from deps since it's in staticValues

    // Optimized content animation - reduced calculations
    const contentAnimatedStyle = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;

      const opacity = interpolate(
        progress,
        [0, CONTENT_FADE_THRESHOLD, 0.7],
        [1, 0.6, 0],
        Extrapolation.CLAMP
      );

      const translateY = interpolate(
        progress,
        [0, 0.5],
        [0, -8], // Subtle upward movement
        Extrapolation.CLAMP
      );

      const scale = interpolate(
        progress,
        [0, 0.5],
        [1, 0.98], // Subtle scale for depth
        Extrapolation.CLAMP
      );

      return {
        opacity,
        transform: [{ translateY }, { scale }],
      };
    }, [headerHeight]);

    // Optimized overlay animation
    const overlayStyle = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;

      return {
        opacity: interpolate(
          progress,
          [0, 0.3, 0.8],
          staticValues.overlayOpacityRange,
          Extrapolation.CLAMP
        ),
        backgroundColor: contrastOverlay,
      };
    }, [headerHeight, contrastOverlay]);

    // Enhanced gradient with better color science
    const gradientColors = useMemo(() => {
      const bgColor = colors.background;
      // Use greenish-tinted overlay colors that match the new background
      const overlayColor = isDarkMode ? 'rgba(14,19,16,' : 'rgba(248,250,249,';

      return [
        'transparent',
        `${overlayColor}0.08)`, // Subtle start with green tint
        `${overlayColor}0.16)`, // Gradual build with green tint
        `${overlayColor}0.28)`, // Medium contrast with green tint
        `${overlayColor}0.42)`, // Strong contrast for text with green tint
        `${bgColor}20`, // Background color introduction
        `${bgColor}60`, // More background
        `${bgColor}90`, // Nearly opaque
        `${bgColor}F8`, // Almost full
        bgColor, // Full background
      ] as const;
    }, [colors.background, isDarkMode]);

    // Optimized staggered animation for metadata items - memoized function
    const createMetadataItemStyle = useCallback(
      (index: number) => {
        return useAnimatedStyle(() => {
          'worklet';
          const progress = smoothScrollY.value / headerHeight;
          const delay = index * 0.05; // Stagger delay

          const opacity = interpolate(
            progress,
            [0, CONTENT_FADE_THRESHOLD + delay, 0.7 + delay],
            [1, 0.7, 0],
            Extrapolation.CLAMP
          );

          const translateY = interpolate(progress, [0, 0.5 + delay], [0, -4], Extrapolation.CLAMP);

          return {
            opacity,
            transform: [{ translateY }],
          };
        }, [index, headerHeight]);
      },
      [headerHeight]
    );

    // Dynamic content section style to handle safe area
    const contentSectionStyle = useMemo(
      () => ({
        ...styles.contentSection,
        paddingTop: LAYOUT.SPACING.LARGE + topInset, // Add topInset here instead of using topSpace
      }),
      [topInset]
    );

    return (
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        {/* Background Image with Enhanced Parallax */}
        <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
          <EnhancedImage
            source={staticValues.imageSource}
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

        {/* Dynamic Contrast Overlay */}
        <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" />

        {/* Advanced Gradient System */}
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          pointerEvents="none"
          locations={[0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.85, 0.95, 1]} // Precise color stops
        />

        {/* Safe Area Spacer - Removed to make image stick to top */}
        {/* <View style={[styles.topSpace, { marginTop: topInset }]} /> */}

        {/* Content Section with Enhanced Hierarchy */}
        <Animated.View style={[contentSectionStyle, contentAnimatedStyle]}>
          {/* Primary Content Group: Title and Author */}
          <View style={styles.primaryContentGroup}>
            <ThemedText
              type="heading2"
              style={dynamicTextStyles.title}
              adjustsFontSizeToFit={!!(article.title && article.title.length > 60)}
              numberOfLines={article.title && article.title.length > 80 ? 3 : 2}
              allowFontScaling={true} // Respect user font size preferences
            >
              {article.title}
            </ThemedText>

            {article.author && (
              <ThemedText type="label" style={dynamicTextStyles.author}>
                by {article.author.name}
              </ThemedText>
            )}
          </View>

          {/* Secondary Content Group: Metadata - Unified Row */}
          <View style={styles.metadataGroup}>
            {/* Single metadata row with all three items */}
            <View style={styles.metadataRow}>
              {/* Category - Primary importance with visual emphasis */}
              {article.category && (
                <Animated.View
                  style={[styles.metadataItem, styles.categoryItem, createMetadataItemStyle(0)]}
                >
                  <Ionicons
                    name="folder-outline"
                    size={14}
                    color={dynamicTextStyles.metadataIcon.color}
                    style={dynamicTextStyles.metadataIcon}
                  />
                  <ThemedText
                    type="caption"
                    style={[dynamicTextStyles.metadataText, styles.categoryText]}
                  >
                    {capitalizeFirstLetter(article.category.name)}
                  </ThemedText>
                </Animated.View>
              )}

              {/* Reading Time - Secondary importance */}
              <Animated.View style={[styles.metadataItem, createMetadataItemStyle(1)]}>
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={dynamicTextStyles.metadataIcon.color}
                  style={dynamicTextStyles.metadataIcon}
                />
                <ThemedText type="caption" style={dynamicTextStyles.metadataText}>
                  {readingTime} min read
                </ThemedText>
              </Animated.View>

              {/* Difficulty Level - Tertiary importance */}
              <Animated.View style={[styles.metadataItem, createMetadataItemStyle(2)]}>
                <Ionicons
                  name="stats-chart-outline"
                  size={13}
                  color={dynamicTextStyles.metadataIcon.color}
                  style={dynamicTextStyles.metadataIcon}
                />
                <ThemedText type="caption" style={dynamicTextStyles.metadataText}>
                  {formatDifficultyLevel(article.difficulty_level)}
                </ThemedText>
              </Animated.View>
            </View>
          </View>

          {/* Tertiary Content Group: Summary */}
          {article.summary && (
            <View style={styles.summaryGroup}>
              <ThemedText
                type="body"
                style={dynamicTextStyles.summary}
                numberOfLines={4}
                ellipsizeMode="tail"
              >
                {article.summary}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Refined Visual Separator */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </Animated.View>
    );
  },
  // Enhanced memo comparison
  (prevProps, nextProps) => {
    return (
      prevProps.article.id === nextProps.article.id &&
      prevProps.isDarkMode === nextProps.isDarkMode &&
      prevProps.headerHeight === nextProps.headerHeight &&
      prevProps.topInset === nextProps.topInset
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 0, // Ensure no border radius on container
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.background,
    overflow: 'hidden',
    borderRadius: 0, // Ensure no border radius on image wrapper
    left: 0, // Explicitly set to reach left edge
    right: 0, // Explicitly set to reach right edge
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 0, // Override EnhancedImage's default border radius
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
    paddingHorizontal: LAYOUT.SPACING.MEDIUM, // Increased from SMALL (8px) to MEDIUM (12px)
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.XXLARGE + LAYOUT.SPACING.SMALL,
    zIndex: 3,
  },
  primaryContentGroup: {
    marginBottom: LAYOUT.SPACING.MEDIUM, // Increased spacing to separate from metadata
  },
  metadataGroup: {
    marginBottom: LAYOUT.SPACING.LARGE, // Clear separation from summary
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap', // Allow wrapping on smaller screens
    gap: LAYOUT.SPACING.LARGE, // Consistent spacing between all items
  },
  categoryItem: {
    // Category gets visual emphasis through typography, not spacing
    marginRight: LAYOUT.SPACING.TINY, // Subtle extra space to create visual grouping
  },
  categoryText: {
    fontWeight: '600' as const, // Stronger weight for visual hierarchy
    opacity: 0.95, // Highest opacity for primary importance
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1, // Slightly larger for emphasis
  },
  summaryGroup: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth, // Use hairline width for crisp lines
    opacity: 0.12, // Refined opacity for subtle separation
    width: '100%',
  },
});

ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
