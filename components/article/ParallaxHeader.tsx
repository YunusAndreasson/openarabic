import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnhancedImage } from '@/components/EnhancedImage';
import { SCREEN_WIDTH } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

// Extract constants outside component to prevent recreation
const GOLDEN_RATIO = 1.618; // True golden ratio for optimal header proportions
const BASE_HEADER_HEIGHT = Math.round(SCREEN_WIDTH / GOLDEN_RATIO); // Base height based on golden ratio
const GRADIENT_HEIGHT_PERCENTAGE = '60%';

// Static styles to prevent recreation
const STATIC_STYLES = StyleSheet.create({
  container: {
    // Remove position relative to avoid z-index issues
  },
  imageSection: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden', // Ensure image doesn't bleed outside container
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: GRADIENT_HEIGHT_PERCENTAGE,
  },
  backgroundGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

interface ParallaxHeaderProps {
  article: Article;
  colors: ThemeColors;
}

/**
 * Custom comparison function for React.memo optimization
 */
const ParallaxHeaderComparison = (
  prevProps: ParallaxHeaderProps,
  nextProps: ParallaxHeaderProps
): boolean => {
  // Quick path comparisons first (most likely to change)
  if (prevProps.article !== nextProps.article) return false;
  if (prevProps.colors !== nextProps.colors) return false;

  // Article properties comparison
  if (prevProps.article.image_url !== nextProps.article.image_url) return false;

  // Colors comparison (most critical for gradient calculations)
  if (prevProps.colors.black !== nextProps.colors.black) return false;
  if (prevProps.colors.white !== nextProps.colors.white) return false;
  if (prevProps.colors.background !== nextProps.colors.background) return false;
  if (prevProps.colors.headingText !== nextProps.colors.headingText) return false;
  if (prevProps.colors.text !== nextProps.colors.text) return false;

  return true;
};

/**
 * Optimized ParallaxHeader component with performance enhancements
 */
const ParallaxHeaderInternal = memo<ParallaxHeaderProps>(({ article, colors }) => {
  const insets = useSafeAreaInsets();

  // Calculate dynamic height including safe area for proper image display
  const headerHeight = useMemo(() => {
    return BASE_HEADER_HEIGHT + insets.top;
  }, [insets.top]);

  // Memoize image section style with dynamic height
  const imageSectionStyle = useMemo(
    () => ({
      ...STATIC_STYLES.imageSection,
      height: headerHeight,
    }),
    [headerHeight]
  );

  // Memoize image source - images are guaranteed to be available
  const imageSource = useMemo(() => String(article.image_url), [article.image_url]);

  // Enhanced gradient for better text visibility - different approach for light vs dark mode
  const imageGradientColors = useMemo(() => {
    // In light mode, use a light overlay for text visibility
    // In dark mode, use a dark overlay
    if (colors.headingText === colors.text) {
      // Light mode - use light overlay to provide contrast for dark text
      return [
        'transparent',
        'transparent',
        withOpacity(colors.white, 0.03),
        withOpacity(colors.white, 0.08),
        withOpacity(colors.white, 0.15),
        withOpacity(colors.white, 0.25),
        withOpacity(colors.white, 0.4), // Light overlay for dark text visibility
      ] as const;
    } else {
      // Dark mode - use dark overlay
      return [
        'transparent',
        'transparent',
        withOpacity(colors.black, 0.03),
        withOpacity(colors.black, 0.08),
        withOpacity(colors.black, 0.15),
        withOpacity(colors.black, 0.25),
        withOpacity(colors.black, 0.4), // Dark overlay for light text visibility
      ] as const;
    }
  }, [colors.black, colors.white, colors.headingText, colors.text]);

  // Background gradient colors for smooth transition to content with memoization
  const backgroundGradientColors = useMemo(() => {
    const bgColor = colors.background;

    // Use appropriate overlay color based on theme
    const overlayColor = colors.headingText === colors.text ? colors.white : colors.black;

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
  }, [colors.background, colors.black, colors.white, colors.headingText, colors.text]);

  // Memoize EnhancedImage props to prevent unnecessary re-renders
  const imageProps = useMemo(
    () => ({
      source: imageSource,
      style: STATIC_STYLES.image,
      contentFit: 'cover' as const,
      contentPosition: 'center' as const,
      priority: 'high' as const,
      cachePolicy: 'disk' as const,
    }),
    [imageSource]
  );

  return (
    <View style={STATIC_STYLES.container}>
      {/* Background Image Section with safe area height */}
      <View style={imageSectionStyle}>
        <EnhancedImage {...imageProps} />

        {/* Enhanced image gradient for summary overlay */}
        <LinearGradient
          colors={imageGradientColors}
          style={STATIC_STYLES.imageGradientOverlay}
          pointerEvents="none"
        />

        {/* Background transition gradient */}
        <LinearGradient
          colors={backgroundGradientColors}
          style={STATIC_STYLES.backgroundGradientOverlay}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}, ParallaxHeaderComparison);

ParallaxHeaderInternal.displayName = 'ParallaxHeader';

export default ParallaxHeaderInternal;
