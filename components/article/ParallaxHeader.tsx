import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

// Increased header height to accommodate overlapping summary
const HEADER_IMAGE_HEIGHT = 280;

interface ParallaxHeaderProps {
  article: Article;
  colors: ThemeColors;
}

const ParallaxHeader = memo<ParallaxHeaderProps>(({ article, colors }) => {
  // Image source - safely handle potential undefined
  const imageSource = String(article.image_url);

  // Enhanced gradient for better summary integration
  const imageGradientColors = useMemo(() => {
    return [
      'transparent',
      'transparent',
      withOpacity(colors.black, 0.03),
      withOpacity(colors.black, 0.08),
      withOpacity(colors.black, 0.15),
      withOpacity(colors.black, 0.25),
      withOpacity(colors.black, 0.4), // Stronger gradient for summary overlay
    ] as const;
  }, [colors.black]);

  // Background gradient colors for smooth transition to content
  const backgroundGradientColors = useMemo(() => {
    const bgColor = colors.background;
    const overlayColor = colors.black;

    return [
      'transparent',
      'transparent',
      'transparent',
      withOpacity(overlayColor, 0.05),
      withOpacity(overlayColor, 0.15),
      withOpacity(overlayColor, 0.3),
      withOpacity(overlayColor, 0.5),
      withOpacity(overlayColor, 0.7),
      withOpacity(overlayColor, 0.85),
      bgColor,
    ] as const;
  }, [colors.background, colors.black]);

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
});

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
