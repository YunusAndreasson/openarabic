import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Clean header image height focused on the image
const HEADER_IMAGE_HEIGHT = 240;

interface ParallaxHeaderProps {
  article: Article;
  colors: ThemeColors;
  isDarkMode?: boolean;
}

const ParallaxHeader = React.memo<ParallaxHeaderProps>(
  ({ article, colors, isDarkMode = false }) => {
    // Image source - we know there's always an image
    const imageSource = article.image_url!;

    // Light gradient for elegant image transition
    const imageGradientColors = useMemo(() => {
      return [
        'transparent',
        'transparent',
        'rgba(0, 0, 0, 0.05)',
        'rgba(0, 0, 0, 0.1)',
        'rgba(0, 0, 0, 0.15)',
        'rgba(0, 0, 0, 0.2)',
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
            placeholder={article.placeholder}
          />

          {/* Light image gradient */}
          <LinearGradient
            colors={imageGradientColors}
            style={styles.imageGradientOverlay}
            pointerEvents="none"
          />

          {/* Background transition gradient */}
          <LinearGradient
            colors={backgroundGradientColors}
            style={styles.backgroundGradientOverlay}
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
  // Light gradient overlay for elegant image transition
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%', // Cover bottom 40% for subtle effect
  },
  // Background gradient for smooth transition to content
  backgroundGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

ParallaxHeader.displayName = 'ParallaxHeader';

export default ParallaxHeader;
