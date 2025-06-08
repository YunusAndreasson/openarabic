import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';

// Increased header height to accommodate overlapping summary
const HEADER_IMAGE_HEIGHT = 280;

interface ParallaxHeaderProps {
  article: Article;
  colors: ThemeColors;
  isDarkMode?: boolean;
}

const ParallaxHeader = React.memo<ParallaxHeaderProps>(
  ({ article, colors, isDarkMode = false }) => {
    // Image source - we know there's always an image
    const imageSource = article.image_url!;

    // Enhanced gradient for better summary integration
    const imageGradientColors = useMemo(() => {
      return [
        'transparent',
        'transparent',
        'rgba(0, 0, 0, 0.03)',
        'rgba(0, 0, 0, 0.08)',
        'rgba(0, 0, 0, 0.15)',
        'rgba(0, 0, 0, 0.25)',
        'rgba(0, 0, 0, 0.4)', // Stronger gradient for summary overlay
      ] as const;
    }, []);

    // Background gradient colors for smooth transition to content
    const backgroundGradientColors = useMemo(() => {
      const bgColor = colors.background;
      const overlayColor = isDarkMode ? 'rgba(0,0,0,' : 'rgba(0,0,0,';

      return [
        'transparent',
        'transparent',
        'transparent',
        `${overlayColor}0.05)`,
        `${overlayColor}0.15)`,
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

          {/* Enhanced image gradient for summary overlay */}
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
  // Image section - Extended height for overlapping summary
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
  // Enhanced gradient overlay for summary integration
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%', // Increased from 40% to 60% for better summary integration
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
