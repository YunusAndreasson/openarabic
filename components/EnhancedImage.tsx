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
}: EnhancedImageProps) {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();

  // Image loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Use standardized fade in animation for the image
  const { animatedStyle: imageAnimatedStyle, startAnimation: startImageAnimation } =
    useFadeInAnimation(0, 300);

  // For the loading indicator, we need more control to hide it
  const loadingOpacity = useSharedValue(1);
  const loadingAnimatedStyle = { opacity: loadingOpacity };

  // Memoize these values to prevent unnecessary recalculations
  const optimizedSource = useMemo(
    () => (!disableOptimization && source ? getOptimizedImageUrl(source) : source),
    [source, disableOptimization]
  );

  const placeholderColor = useMemo(() => getPlaceholderColor(isDarkMode), [isDarkMode]);

  // Memoize container styles
  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: placeholderColor }, style],
    [placeholderColor, style]
  );

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);

    // Start image fade-in animation
    startImageAnimation();

    // Fade out loading indicator
    loadingOpacity.value = withTiming(0, { duration: 200 });

    // Trigger custom onLoad callback if provided
    if (onLoad) onLoad();
  }, [startImageAnimation, loadingOpacity, onLoad]);

  // Handle load error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setIsError(true);

    // Fade out loading indicator
    loadingOpacity.value = withTiming(0, { duration: 150 });

    // Trigger custom onError callback if provided
    if (onError) onError();
  }, [loadingOpacity, onError]);

  // Don't render anything if source is empty
  if (!source) {
    return null;
  }

  return (
    <View style={containerStyle} accessibilityLabel={alt}>
      {/* Loading indicator */}
      {showLoadingIndicator && isLoading && (
        <Animated.View style={[styles.loadingContainer, loadingAnimatedStyle]} pointerEvents="none">
          <LoadingContainer size="small" />
        </Animated.View>
      )}

      {/* Main image */}
      <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
        <Image
          source={{ uri: optimizedSource }}
          style={styles.image}
          contentFit={contentFit}
          transition={300}
          onLoad={handleImageLoad}
          onError={handleError}
          cachePolicy="memory-disk"
          accessible={!!alt}
          accessibilityLabel={alt}
        />
      </Animated.View>

      {/* Error state */}
      {isError && (
        <View style={styles.errorContainer}>
          <View style={[styles.errorFallback, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="image-outline" size={48} color={colors.icon} style={styles.errorIcon} />
          </View>
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
