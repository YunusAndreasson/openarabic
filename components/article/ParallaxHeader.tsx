import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnhancedImage } from '@/components/EnhancedImage';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import {
  calculateHeaderHeight,
  createBackgroundGradientColors,
  createImageGradientColors,
} from '@/utils/gradientUtils';
import { generateImageUrl } from '@/utils/imageUtils';

const GRADIENT_HEIGHT_PERCENTAGE = '60%';

// Static styles to prevent recreation
const STATIC_STYLES = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  // Shared scroll value from the list to drive parallax/stretch
  scrollY: SharedValue<number>;
}

/**
 * Custom comparison function for React.memo optimization
 */
const ParallaxHeaderComparison = (
  prevProps: ParallaxHeaderProps,
  nextProps: ParallaxHeaderProps,
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

  return true;
};

/**
 * Optimized ParallaxHeader component with performance enhancements
 */
const ParallaxHeaderInternal = memo<ParallaxHeaderProps>(({ article, colors, scrollY }) => {
  const insets = useSafeAreaInsets();
  const isDarkMode = useIsDarkMode();

  // Calculate dynamic height including safe area for proper image display
  const headerHeight = useMemo(() => {
    return calculateHeaderHeight(insets.top);
  }, [insets.top]);

  // Container with absolute positioning and fixed height
  const containerStyle = useMemo(
    () => ({
      ...STATIC_STYLES.container,
      height: headerHeight,
    }),
    [headerHeight],
  );

  // Memoize image section style with dynamic height
  const imageSectionStyle = useMemo(
    () => ({
      ...STATIC_STYLES.imageSection,
      height: headerHeight,
    }),
    [headerHeight],
  );

  // Memoize image source - images are guaranteed to be available
  const imageSource = useMemo(() => generateImageUrl(article.image_url), [article.image_url]);

  // Enhanced gradient for better text visibility - different approach for light vs dark mode
  const imageGradientColors = useMemo(() => {
    return createImageGradientColors(colors, isDarkMode);
  }, [colors, isDarkMode]);

  // Background gradient colors for smooth transition to content with memoization
  const backgroundGradientColors = useMemo(() => {
    return createBackgroundGradientColors(colors, isDarkMode);
  }, [colors, isDarkMode]);

  // Animated parallax and pull-to-stretch effect
  // CRITICAL: Don't include headerHeight in dependency array - causes Android crashes
  // The value is captured in closure and used correctly by worklet
  const animatedImageStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    const translateY = y > 0 ? -y * 0.6 : 0; // slower upward movement for parallax
    const maxExtraScale = 0.08; // cap stretch at +8%
    const scale = y < 0 ? 1 + Math.min(-y / headerHeight, maxExtraScale) : 1;
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Memoize EnhancedImage props to prevent unnecessary re-renders
  const imageProps = useMemo(
    () => ({
      source: imageSource,
      style: STATIC_STYLES.image,
      priority: 'high' as const,
      cachePolicy: 'memory-disk' as const,
    }),
    [imageSource],
  );

  return (
    <Animated.View style={containerStyle} pointerEvents="none">
      {/* Background Image Section with safe area height */}
      <Animated.View style={[imageSectionStyle, animatedImageStyle]}>
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
      </Animated.View>
    </Animated.View>
  );
}, ParallaxHeaderComparison);

ParallaxHeaderInternal.displayName = 'ParallaxHeader';

export const ParallaxHeader = ParallaxHeaderInternal;
