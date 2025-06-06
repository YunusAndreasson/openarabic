 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useDerivedValue,
} from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { DEFAULT_IMAGES } from '@/constants/images';
import { LAYOUT, HEADER_IMAGE_HEIGHT } from '@/constants/layout';
import { formatDifficultyLevel } from '@/services/difficultyLevel';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import { EnhancedImage } from '../EnhancedImage';
import { ThemedText } from '../ThemedText';

const PARALLAX_FACTOR = 0.35; // Further refined for optimal parallax feel
const CONTENT_FADE_THRESHOLD = 0.4; // Earlier fade for better UX
const OVERLAY_MAX_OPACITY = 0.45; // Increased for better text contrast

// Advanced motion design constants
const MOTION_CONFIG = {
  OPACITY_CURVE: [1, 0.85, 0.3], // Refined opacity curve for smooth transitions
} as const;

// Typography scale refinements for better hierarchy - Following design principles
const TYPOGRAPHY_REFINEMENTS = {
  TITLE: {
    letterSpacing: Platform.OS === 'ios' ? -0.6 : -0.4, // Platform-specific optimization
    lineHeight: Platform.OS === 'ios' ? 0.95 : 0.98, // Tighter line height for impact
  },
  AUTHOR: {
    letterSpacing: Platform.OS === 'ios' ? 0.3 : 0.2,
    opacity: 0.85, // Consistent secondary hierarchy
  },
  // Unified metadata styling for consistency (Hick's Law - reduce choice complexity)
  METADATA: {
    letterSpacing: Platform.OS === 'ios' ? 0.4 : 0.3,
    opacity: 0.75, // Consistent tertiary hierarchy
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // All metadata same size
    fontWeight: '500' as const, // Consistent weight
  },
  SUMMARY: {
    letterSpacing: 0.1, // Refined for body text - slightly tighter for italic
    opacity: 0.7, // Lowest in hierarchy to clearly distinguish from content
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // Same as metadata for consistency
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5, // Increased line height for italic readability
  },
} as const;

// Accessibility and contrast improvements
const ACCESSIBILITY_CONFIG = {
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
    // Following Miller's Law: Clear categorization and hierarchy
    const dynamicTextStyles = useMemo(
      () => ({
        title: {
          color: textColor,
          marginBottom: LAYOUT.SPACING.SMALL,
          fontWeight: '800' as const, // Strong hierarchy
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE, // 28px for proper hierarchy
          letterSpacing: TYPOGRAPHY_REFINEMENTS.TITLE.letterSpacing,
          lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * TYPOGRAPHY_REFINEMENTS.TITLE.lineHeight,
        },
        author: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.AUTHOR.opacity,
          marginBottom: LAYOUT.SPACING.LARGE,
          fontWeight: '600' as const,
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE, // 17px - secondary level
          letterSpacing: TYPOGRAPHY_REFINEMENTS.AUTHOR.letterSpacing,
        },
        // Unified metadata styling for consistency
        metadataText: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.METADATA.opacity,
          fontWeight: TYPOGRAPHY_REFINEMENTS.METADATA.fontWeight,
          fontSize: TYPOGRAPHY_REFINEMENTS.METADATA.fontSize, // 15px - all metadata same
          letterSpacing: TYPOGRAPHY_REFINEMENTS.METADATA.letterSpacing,
        },
        metadataIcon: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.METADATA.opacity,
          marginRight: LAYOUT.SPACING.TINY,
        },
        // Summary with proper italic implementation
        summary: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.SUMMARY.opacity,
          fontSize: TYPOGRAPHY_REFINEMENTS.SUMMARY.fontSize, // 15px - same as metadata but differentiated by italic
          lineHeight: TYPOGRAPHY_REFINEMENTS.SUMMARY.lineHeight,
          letterSpacing: TYPOGRAPHY_REFINEMENTS.SUMMARY.letterSpacing,
          fontWeight: '400' as const,
          // Apply italic directly to style - ThemedText will respect this
          fontStyle: 'italic' as const,
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

    // Pre-memoized staggered animation styles - Fixed to avoid hook-in-callback issue
    const metadataItemStyle0 = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;
      const delay = 0 * 0.05; // Stagger delay

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
    }, [headerHeight]);

    const metadataItemStyle1 = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;
      const delay = 1 * 0.05; // Stagger delay

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
    }, [headerHeight]);

    const metadataItemStyle2 = useAnimatedStyle(() => {
      'worklet';
      const progress = smoothScrollY.value / headerHeight;
      const delay = 2 * 0.05; // Stagger delay

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
    }, [headerHeight]);

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
            allowDownscaling={false}
            blurRadius={0}
            contentFit="cover"
            priority="high"
            source={staticValues.imageSource}
            style={styles.image}
            transition={300}
            placeholder={
              article.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
          />
        </Animated.View>

        {/* Dynamic Contrast Overlay */}
        <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]} />

        {/* Advanced Gradient System */}
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.85, 0.95, 1]} // Precise color stops
          pointerEvents="none"
          style={styles.gradient}
        />

        {/* Content Section with Enhanced Hierarchy - Following Miller's Law */}
        <Animated.View style={[contentSectionStyle, contentAnimatedStyle]}>
          {/* Primary Content Group: Title and Author */}
          <View style={styles.primaryContentGroup}>
            <ThemedText
              adjustsFontSizeToFit={!!(article.title && article.title.length > 60)}
              allowFontScaling={true} // Respect user font size preferences
              numberOfLines={article.title && article.title.length > 80 ? 3 : 2}
              style={dynamicTextStyles.title}
              type="heading2"
            >
              {article.title}
            </ThemedText>

            {article.author && (
              <ThemedText style={dynamicTextStyles.author} type="label">
                by {article.author.name}
              </ThemedText>
            )}
          </View>

          {/* Secondary Content Group: Metadata - Simplified and Consistent */}
          <View style={styles.metadataGroup}>
            <View style={styles.metadataRow}>
              {/* Category - Now consistent with other metadata */}
              {article.category && (
                <Animated.View style={[styles.metadataItem, metadataItemStyle0]}>
                  <Ionicons
                    color={dynamicTextStyles.metadataIcon.color}
                    name="folder-outline"
                    size={15} // Consistent icon size
                    style={dynamicTextStyles.metadataIcon}
                  />
                  <ThemedText style={dynamicTextStyles.metadataText} type="caption">
                    {capitalizeFirstLetter(article.category.name)}
                  </ThemedText>
                </Animated.View>
              )}

              {/* Reading Time */}
              <Animated.View style={[styles.metadataItem, metadataItemStyle1]}>
                <Ionicons
                  color={dynamicTextStyles.metadataIcon.color}
                  name="time-outline"
                  size={15}
                  style={dynamicTextStyles.metadataIcon}
                />
                <ThemedText style={dynamicTextStyles.metadataText} type="caption">
                  {readingTime} min read
                </ThemedText>
              </Animated.View>

              {/* Difficulty Level */}
              <Animated.View style={[styles.metadataItem, metadataItemStyle2]}>
                <Ionicons
                  color={dynamicTextStyles.metadataIcon.color}
                  name="stats-chart-outline"
                  size={15}
                  style={dynamicTextStyles.metadataIcon}
                />
                <ThemedText style={dynamicTextStyles.metadataText} type="caption">
                  {formatDifficultyLevel(article.difficulty_level)}
                </ThemedText>
              </Animated.View>
            </View>
          </View>

          {/* Tertiary Content Group: Summary with Proper Italic */}
          {article.summary && (
            <View style={styles.summaryGroup}>
              <ThemedText
                ellipsizeMode="tail"
                numberOfLines={4}
                style={dynamicTextStyles.summary}
                type="body"
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
    borderRadius: 0,
    overflow: 'hidden',
    width: '100%',
  },
  contentSection: {
    bottom: 0,
    left: 0,
    paddingBottom: LAYOUT.SPACING.XXLARGE + LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.LARGE,
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.12,
    width: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  image: {
    borderRadius: 0,
    height: '100%',
    width: '100%',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.background,
    borderRadius: 0,
    left: 0,
    overflow: 'hidden',
    right: 0,
  },
  metadataGroup: {
    marginBottom: LAYOUT.SPACING.XLARGE, // Clear separation from summary
  },
  metadataItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  metadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.LARGE, // Consistent spacing - Following Fitts's Law
    justifyContent: 'flex-start',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  primaryContentGroup: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  summaryGroup: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  topSpace: {
    height: 60,
    width: '100%',
  },
});

ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
