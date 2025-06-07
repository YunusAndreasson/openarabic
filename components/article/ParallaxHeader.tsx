import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { DEFAULT_IMAGES } from '@/constants/images';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Fixed header image height for better image visibility
const HEADER_IMAGE_HEIGHT = 200;

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
});

ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
