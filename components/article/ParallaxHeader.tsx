import { EnhancedImage } from '@/components/ui';
import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';

import { SCREEN_WIDTH } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import {
  calculateHeaderHeight,
  createBackgroundGradientColors,
  createImageGradientColors,
} from '@/utils/gradientUtils';
import { generateStorageUrl } from '@/utils/storageUtils';

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
  gradientOverlay: {
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
  return prevProps.article === nextProps.article && prevProps.colors === nextProps.colors;
};

/**
 * Optimized ParallaxHeader component with performance enhancements
 */
const ParallaxHeaderInternal = memo<ParallaxHeaderProps>(({ article, colors, scrollY }) => {
  const insets = useSafeAreaInsets();

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
  const imageSource = useMemo(
    () => generateStorageUrl('images', article.image_url),
    [article.image_url],
  );

  // Enhanced gradient for better text visibility (theme-aware via colors.gradientOverlay)
  const imageGradientColors = useMemo(() => {
    return createImageGradientColors(colors);
  }, [colors]);

  // Background gradient colors for smooth transition to content
  const backgroundGradientColors = useMemo(() => {
    return createBackgroundGradientColors(colors);
  }, [colors]);

  // Animated parallax and pull-to-stretch effect
  const animatedImageStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    const translateY = y > 0 ? -y * 0.6 : 0; // slower upward movement for parallax
    const maxExtraScale = 0.08; // cap stretch at +8%
    const scale = y < 0 ? 1 + Math.min(-y / headerHeight, maxExtraScale) : 1;
    // Fade the hero out as content scrolls over it — body text must never
    // sit on the image itself (it becomes unreadable without a scrim).
    const opacity = interpolate(y, [0, headerHeight * 0.6], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  }, [headerHeight]);

  // Memoize EnhancedImage props to prevent unnecessary re-renders
  const imageProps = useMemo(
    () => ({
      source: imageSource,
      style: STATIC_STYLES.image,
      priority: 'high' as const,
    }),
    [imageSource],
  );

  return (
    <Animated.View style={containerStyle} pointerEvents="none">
      {/* Background Image Section with safe area height */}
      <Animated.View style={[imageSectionStyle, animatedImageStyle]}>
        <EnhancedImage {...imageProps} />

        {/* Both gradients in ONE canvas (one Skia surface) - Skia for Android stability.
            Image gradient covers the bottom 60% for summary legibility; the background
            transition gradient draws on top across the full header. */}
        <Canvas style={STATIC_STYLES.gradientOverlay} pointerEvents="none">
          <Rect x={0} y={headerHeight * 0.4} width={SCREEN_WIDTH} height={headerHeight * 0.6}>
            <LinearGradient
              start={vec(0, headerHeight * 0.4)}
              end={vec(0, headerHeight)}
              colors={[...imageGradientColors]}
            />
          </Rect>
          <Rect x={0} y={0} width={SCREEN_WIDTH} height={headerHeight}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, headerHeight)}
              colors={[...backgroundGradientColors]}
            />
          </Rect>
        </Canvas>
      </Animated.View>
    </Animated.View>
  );
}, ParallaxHeaderComparison);

ParallaxHeaderInternal.displayName = 'ParallaxHeader';

export const ParallaxHeader = ParallaxHeaderInternal;
