import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { LAYOUT } from '../constants/layout';
import { LoadingContainer } from './Loader';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import {
  getPlaceholderColor,
  getOptimizedImageUrl,
  getResponsiveImageSize,
  generateTinyPreview,
  getImageLoadPriority,
} from '../utils/imageOptimization';
import { useOpacityAnimation } from '@/hooks/animations';
import { EnhancedImageProps } from '@/types/ui.types';

/**
 * EnhancedImage component with loading animations and optimizations
 *
 * Features:
 * - Loading state with smooth transitions
 * - Error handling with fallback
 * - Optimized image loading and caching
 * - Responsive sizing based on screen dimensions
 * - Blur-up loading with tiny preview
 * - Prioritized loading based on visibility
 * - Accessibility support
 * - Memory-efficient with memoization
 * - Prefetching for critical images
 */
function EnhancedImageInternal({
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
  originalWidth,
  originalHeight,
  containerWidthPercent = 1,
  isVisible = true,
  distanceFromViewport = 0,
  prefetch = false,
}: EnhancedImageProps) {
  const isDarkMode = useIsDarkMode();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Optimize source URL if needed
  const optimizedSource = useMemo(() => {
    return disableOptimization ? source : getOptimizedImageUrl(source);
  }, [source, disableOptimization]);

  // Generate tiny preview for blur-up effect
  const tinyPreview = useMemo(() => {
    return disableOptimization ? null : generateTinyPreview(source);
  }, [source, disableOptimization]);

  // Calculate responsive image dimensions if original dimensions provided
  const imageDimensions = useMemo(() => {
    if (originalWidth && originalHeight) {
      return getResponsiveImageSize(originalWidth, originalHeight, containerWidthPercent);
    }
    return null;
  }, [originalWidth, originalHeight, containerWidthPercent]);

  // Determine loading priority based on visibility
  const loadPriority = useMemo(() => {
    return priority === 'normal' ? getImageLoadPriority(isVisible, distanceFromViewport) : priority;
  }, [priority, isVisible, distanceFromViewport]);

  // Get placeholder color
  const placeholderColor = useMemo(() => {
    return getPlaceholderColor(isDarkMode);
  }, [isDarkMode]);

  // Optimize fade animation - faster for better perceived performance
  // Reduced duration from 300ms to a snappier 150ms
  const { animatedStyle, startAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: 0,
    duration: 150,
  });

  // Prefetch image if the prefetch prop is true
  useEffect(() => {
    if (prefetch && optimizedSource) {
      // This will cache the image before it's needed for display
      Image.prefetch(optimizedSource);
    }
  }, [prefetch, optimizedSource]);

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
    <View
      style={[
        styles.container,
        style,
        imageDimensions ? { width: imageDimensions.width, height: imageDimensions.height } : null,
      ]}
    >
      {/* Tiny preview for blur-up effect */}
      {isLoading && tinyPreview && (
        <View style={styles.blurPlaceholder}>
          <Image
            source={{ uri: tinyPreview }}
            contentFit={contentFit}
            blurRadius={5}
            style={styles.image}
            cachePolicy={cachePolicy}
          />
        </View>
      )}

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
          priority={loadPriority}
          recyclingKey={optimizedSource} // Add recyclingKey for better memory management
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

// Wrap with React.memo to prevent unnecessary re-renders
export const EnhancedImage = React.memo(EnhancedImageInternal);

// Create a utility function for prefetching images in bulk
export const prefetchImages = async (urls: string[]) => {
  if (!urls || urls.length === 0) return;

  // Create an array of prefetch promises
  const prefetchPromises = urls.map(url => {
    const optimizedUrl = getOptimizedImageUrl(url);
    return Image.prefetch(optimizedUrl);
  });

  // Return a promise that resolves when all images are prefetched
  return Promise.all(prefetchPromises);
};

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
  blurPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
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
});
