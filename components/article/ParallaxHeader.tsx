import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_IMAGES } from '@/constants/images';
import { LAYOUT } from '@/constants/layout';
import { formatDifficultyLevel } from '@/services/difficultyLevel';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Typography scale refinements for better hierarchy - Following design principles
const TYPOGRAPHY_REFINEMENTS = {
  TITLE: {
    letterSpacing: -0.6,
    lineHeight: 1.15,
  },
  AUTHOR: {
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  METADATA: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
    opacity: 0.72,
  },
  SUMMARY: {
    fontSize: 15,
    lineHeight: 1.4,
    letterSpacing: 0.1,
    opacity: 0.8,
  },
} as const;

// Fixed header image height for better image visibility
const HEADER_IMAGE_HEIGHT = 200;

interface ParallaxHeaderProps {
  article: Article;
  colors: ThemeColors;
  isDarkMode?: boolean;
}

const ParallaxHeader = React.memo<ParallaxHeaderProps>(
  ({ article, colors, isDarkMode = false }) => {
    // Enhanced text colors with better accessibility
    const textColor = useMemo(() => colors.primary, [colors.primary]);

    // Dynamic text styles with enhanced hierarchy
    const dynamicTextStyles = useMemo(
      () => ({
        title: {
          color: textColor,
          marginBottom: LAYOUT.SPACING.SMALL,
          fontWeight: '800' as const,
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
          letterSpacing: TYPOGRAPHY_REFINEMENTS.TITLE.letterSpacing,
          lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * TYPOGRAPHY_REFINEMENTS.TITLE.lineHeight,
        },
        author: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.AUTHOR.opacity,
          marginBottom: LAYOUT.SPACING.LARGE,
          fontWeight: '600' as const,
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
          letterSpacing: TYPOGRAPHY_REFINEMENTS.AUTHOR.letterSpacing,
        },
        metadataText: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.METADATA.opacity,
          fontWeight: TYPOGRAPHY_REFINEMENTS.METADATA.fontWeight,
          fontSize: TYPOGRAPHY_REFINEMENTS.METADATA.fontSize,
          letterSpacing: TYPOGRAPHY_REFINEMENTS.METADATA.letterSpacing,
        },
        metadataIcon: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.METADATA.opacity,
          marginRight: LAYOUT.SPACING.TINY,
        },
        summary: {
          color: textColor,
          opacity: TYPOGRAPHY_REFINEMENTS.SUMMARY.opacity,
          fontSize: TYPOGRAPHY_REFINEMENTS.SUMMARY.fontSize,
          lineHeight:
            TYPOGRAPHY_REFINEMENTS.SUMMARY.fontSize * TYPOGRAPHY_REFINEMENTS.SUMMARY.lineHeight,
          letterSpacing: TYPOGRAPHY_REFINEMENTS.SUMMARY.letterSpacing,
          fontWeight: '400' as const,
          fontStyle: 'italic' as const,
          textAlign: 'left' as const,
        },
      }),
      [textColor]
    );

    // Reading time calculation
    const readingTime = useMemo(() => {
      if (!article) return 2;

      if (article.article_sentences?.length) {
        const wordCount = article.article_sentences.reduce((total, sentence) => {
          const estimatedWords = Math.ceil((sentence.english?.length || 0) / 5);
          return total + estimatedWords;
        }, 0);
        return Math.max(1, Math.ceil(wordCount / 200));
      }

      if (article.summary) {
        const wordCount = article.summary.split(/\s+/).filter(word => word.length > 0).length;
        return Math.max(1, Math.ceil(wordCount / 200));
      }

      return 2;
    }, [article]);

    // Image source
    const imageSource = useMemo(() => {
      return article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER;
    }, [article.image_url]);

    // Gradient colors for smooth transition
    const gradientColors = useMemo(() => {
      const bgColor = colors.background;
      const overlayColor = isDarkMode ? 'rgba(0,0,0,' : 'rgba(0,0,0,';

      return [
        'transparent',
        'transparent',
        `${overlayColor}0.1)`,
        `${overlayColor}0.3)`,
        `${overlayColor}0.5)`,
        `${overlayColor}0.7)`,
        `${overlayColor}0.85)`,
        bgColor,
      ] as const;
    }, [colors.background, isDarkMode]);

    return (
      <View style={styles.container}>
        {/* Background Image Section - Visible at top */}
        <View style={styles.imageSection}>
          <EnhancedImage
            source={imageSource}
            style={styles.image}
            contentFit="cover"
            contentPosition="center"
            priority="high"
            placeholder={
              article.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
          />
          {/* Gradient overlay for smooth transition */}
          <LinearGradient
            colors={gradientColors}
            style={styles.gradientOverlay}
            pointerEvents="none"
          />
        </View>

        {/* Content Section - Overlaps image with proper styling */}
        <View style={[styles.contentSection, { backgroundColor: colors.background }]}>
          {/* Title and Author */}
          <View style={styles.primaryContentGroup}>
            <ThemedText style={dynamicTextStyles.title} type="heading2" numberOfLines={3}>
              {article.title}
            </ThemedText>

            {article.author && (
              <ThemedText style={dynamicTextStyles.author} type="label">
                by {article.author.name}
              </ThemedText>
            )}
          </View>

          {/* Metadata */}
          <View style={styles.metadataGroup}>
            <View style={styles.metadataRow}>
              {article.category && (
                <View style={styles.metadataItem}>
                  <Ionicons
                    color={dynamicTextStyles.metadataIcon.color}
                    name="folder-outline"
                    size={15}
                    style={dynamicTextStyles.metadataIcon}
                  />
                  <ThemedText style={dynamicTextStyles.metadataText} type="caption">
                    {capitalizeFirstLetter(article.category.name)}
                  </ThemedText>
                </View>
              )}

              <View style={styles.metadataItem}>
                <Ionicons
                  color={dynamicTextStyles.metadataIcon.color}
                  name="time-outline"
                  size={15}
                  style={dynamicTextStyles.metadataIcon}
                />
                <ThemedText style={dynamicTextStyles.metadataText} type="caption">
                  {readingTime} min read
                </ThemedText>
              </View>

              {article.difficulty_level && (
                <View style={styles.metadataItem}>
                  <Ionicons
                    color={dynamicTextStyles.metadataIcon.color}
                    name="bar-chart-outline"
                    size={15}
                    style={dynamicTextStyles.metadataIcon}
                  />
                  <ThemedText style={dynamicTextStyles.metadataText} type="caption">
                    {formatDifficultyLevel(article.difficulty_level)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Summary */}
          {article.summary && (
            <View style={styles.summaryGroup}>
              <ThemedText
                style={dynamicTextStyles.summary}
                type="body"
                numberOfLines={undefined}
                ellipsizeMode={undefined}
              >
                {article.summary}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    // Remove position relative to avoid z-index issues
  },
  // Image section - Normal flow, visible at top with safe area consideration
  imageSection: {
    width: '100%',
    height: HEADER_IMAGE_HEIGHT,
    position: 'relative',
    overflow: 'hidden', // Ensure image doesn't bleed outside container
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Content section - Overlaps image with margin offset
  contentSection: {
    marginTop: -HEADER_IMAGE_HEIGHT * 0.3, // Negative margin to overlap image by 30%
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.LARGE,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  // Content groups with enhanced spacing following proximity principles
  primaryContentGroup: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  metadataGroup: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryGroup: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
});

ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
