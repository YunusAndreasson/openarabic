import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_IMAGES } from '@/constants/images';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Increased header image height for better title visibility
const HEADER_IMAGE_HEIGHT = 280;

interface ParallaxHeaderProps {
  article: Article;
  colors: ThemeColors;
  isDarkMode?: boolean;
}

const ParallaxHeader = React.memo<ParallaxHeaderProps>(
  ({ article, colors, isDarkMode = false }) => {
    // Image source
    const imageSource = useMemo(() => {
      return article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER;
    }, [article.image_url]);

    // Gradient colors for title overlay - stronger gradient for text readability
    const titleGradientColors = useMemo(() => {
      return [
        'transparent',
        'transparent',
        'rgba(0, 0, 0, 0.2)',
        'rgba(0, 0, 0, 0.5)',
        'rgba(0, 0, 0, 0.7)',
        'rgba(0, 0, 0, 0.85)',
      ] as const;
    }, []);

    // Background gradient colors for smooth transition to content
    const backgroundGradientColors = useMemo(() => {
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

    // Typography styles for title overlay
    const titleStyle = {
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
      lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.3), // Explicit line height to prevent clipping
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      includeFontPadding: false, // Prevent Android padding issues
      textAlignVertical: 'center' as const,
    };

    const authorStyle = {
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
      lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4), // Proper line height
      fontWeight: '600' as const,
      color: 'rgba(255, 255, 255, 0.95)',
      textShadowColor: 'rgba(0, 0, 0, 0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      includeFontPadding: false,
      textAlignVertical: 'center' as const,
    };

    return (
      <View style={styles.container}>
        {/* Background Image Section */}
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

          {/* Title overlay gradient */}
          <LinearGradient
            colors={titleGradientColors}
            style={styles.titleGradientOverlay}
            pointerEvents="none"
          />

          {/* Background transition gradient */}
          <LinearGradient
            colors={backgroundGradientColors}
            style={styles.backgroundGradientOverlay}
            pointerEvents="none"
          />

          {/* Title and metadata overlay */}
          <View style={styles.titleOverlay}>
            <ThemedText style={titleStyle} numberOfLines={2}>
              {article.title}
            </ThemedText>

            {/* Author below title */}
            {article.author?.name && (
              <ThemedText style={[authorStyle, { marginTop: LAYOUT.SPACING.SMALL }]}>
                {article.author.name}
              </ThemedText>
            )}
          </View>
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
  // Gradient overlay specifically for title text readability
  titleGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%', // Cover bottom 60% for title area
  },
  // Background gradient for smooth transition to content
  backgroundGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Title overlay content
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.XLARGE, // Extra top padding to prevent clipping
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
});

ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
