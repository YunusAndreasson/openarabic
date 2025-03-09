import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { LoadingContainer } from './Loader';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { getPlaceholderColor, getOptimizedImageUrl } from '../utils/imageOptimization';
import { useFadeInAnimation } from '@/hooks/animations';

interface EnhancedImageProps {
  /** Source URL of the image */
  source: string;
  /** Custom styles to apply to the container */
  style?: StyleProp<ViewStyle>;
  /** Content fit mode */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Whether to show loading indicator */
  showLoadingIndicator?: boolean;
  /** Alt text for accessibility */
  alt?: string;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** For testing/debugging - disable optimizations */
  disableOptimization?: boolean;
  /** Image transition duration in ms */
  transition?: number;
  /** Caching policy */
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  /** Blur radius for progressive loading */
  blurRadius?: number;
  /** Loading priority */
  priority?: 'low' | 'normal' | 'high';
}

/**
 * EnhancedImage component with loading animations and optimizations
 *
 * Features:
 * - Loading state with smooth transitions
 * - Error handling with fallback
 * - Optimized image loading and caching
 * - Accessibility support
 * - Memory-efficient with memoization
 */
export function EnhancedImage({
  source,
  style,
  contentFit = 'cover',
  showLoadingIndicator = true,
  alt,
  onLoad,
  onError,
  disableOptimization = false,
  transition = 300,
  cachePolicy = 'memory-disk',
  blurRadius,
  priority = 'normal',
}: EnhancedImageProps) {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Optimize source URL if needed
  const optimizedSource = useMemo(() => {
    return disableOptimization ? source : getOptimizedImageUrl(source);
  }, [source, disableOptimization]);

  // Get placeholder color
  const placeholderColor = useMemo(() => {
    return getPlaceholderColor(isDarkMode);
  }, [isDarkMode]);

  // Use fade-in animation for the image
  const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    startAnimation();
    onLoad?.();
  }, [onLoad, startAnimation]);

  // Handle image error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setIsError(true);
    onError?.();
  }, [onError]);

  return (
    <View style={[styles.container, style]}>
      {/* Loading indicator */}
      {isLoading && showLoadingIndicator && (
        <View style={[styles.loadingContainer, { backgroundColor: placeholderColor }]}>
          <LoadingContainer size="small" />
        </View>
      )}

      {/* Actual image */}
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image
          source={{ uri: optimizedSource }}
          style={styles.image}
          contentFit={contentFit}
          transition={transition}
          onLoad={handleImageLoad}
          onError={handleError}
          cachePolicy={cachePolicy}
          accessible={!!alt}
          accessibilityLabel={alt}
          blurRadius={isLoading ? blurRadius : undefined}
          priority={priority}
        />
      </Animated.View>

      {/* Error state */}
      {isError && (
        <View style={[styles.errorContainer, { backgroundColor: placeholderColor }]}>
          <Ionicons name="alert-circle-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  errorFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    opacity: 0.6,
  },
});
