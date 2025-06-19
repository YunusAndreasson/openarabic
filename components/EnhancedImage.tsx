import { Image } from 'expo-image';
import { useMemo, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedImageProps } from '@/types/ui/image.types';

// Extract constants outside component for better performance
const DEFAULT_CONTENT_FIT = 'cover';
const DEFAULT_CONTENT_POSITION = 'center';
const DEFAULT_TRANSITION_DURATION = 300;
const DEFAULT_CACHE_POLICY = 'disk';
const DEFAULT_PRIORITY = 'normal';
const TRANSITION_EFFECT = 'cross-dissolve' as const;
const TRANSITION_TIMING = 'ease-in-out' as const;
const IMAGE_SIZE = '100%' as const;

// Custom comparison function for memo optimization
const EnhancedImageComparison = (
  prevProps: EnhancedImageProps,
  nextProps: EnhancedImageProps
): boolean => {
  // Quick path comparisons for most common changes
  if (
    prevProps.source !== nextProps.source ||
    prevProps.contentFit !== nextProps.contentFit ||
    prevProps.contentPosition !== nextProps.contentPosition ||
    prevProps.skipTransition !== nextProps.skipTransition ||
    prevProps.cachePolicy !== nextProps.cachePolicy ||
    prevProps.allowDownscaling !== nextProps.allowDownscaling ||
    prevProps.priority !== nextProps.priority ||
    prevProps.autoplay !== nextProps.autoplay ||
    prevProps.onLoad !== nextProps.onLoad ||
    prevProps.onError !== nextProps.onError ||
    prevProps.testID !== nextProps.testID
  ) {
    return false;
  }

  // Style comparison (usually stable but check for custom styles)
  if (prevProps.style !== nextProps.style) {
    return false;
  }

  // Transition comparison - check type and value
  if (typeof prevProps.transition !== typeof nextProps.transition) {
    return false;
  }

  if (typeof prevProps.transition === 'object' && typeof nextProps.transition === 'object') {
    // Deep comparison for transition objects
    const prevTrans = prevProps.transition;
    const nextTrans = nextProps.transition;
    if (
      prevTrans.duration !== nextTrans.duration ||
      prevTrans.effect !== nextTrans.effect ||
      prevTrans.timing !== nextTrans.timing
    ) {
      return false;
    }
  } else if (prevProps.transition !== nextProps.transition) {
    return false;
  }

  return true;
};

// Static styles object to prevent recreation
const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  image: {
    height: IMAGE_SIZE,
    width: IMAGE_SIZE,
  },
});

// Cache for transition objects to prevent recreation
const transitionCache = new Map<string, any>();

// Helper function to create transition cache key
const createTransitionCacheKey = (
  transition: number | object | undefined,
  skipTransition: boolean
): string => {
  if (skipTransition) return 'skip';
  if (typeof transition === 'number') return `num_${transition}`;
  if (typeof transition === 'object') {
    return `obj_${JSON.stringify(transition)}`;
  }
  return `default_${DEFAULT_TRANSITION_DURATION}`;
};

/**
 * High-performance image component optimized for loading, caching, and transitions
 *
 * Performance optimizations:
 * - React.memo with custom comparison function
 * - Cached transition objects to prevent recreation
 * - Static constants extracted outside component
 * - Optimized memoization strategies
 * - Props spreading optimization
 */
function EnhancedImageInternal({
  source,
  style,
  contentFit = DEFAULT_CONTENT_FIT,
  contentPosition = DEFAULT_CONTENT_POSITION,
  onLoad,
  onError,
  transition = DEFAULT_TRANSITION_DURATION,
  skipTransition = false,
  cachePolicy = DEFAULT_CACHE_POLICY,
  allowDownscaling = true,
  priority = DEFAULT_PRIORITY,
  autoplay = true,
  testID,
}: EnhancedImageProps) {
  const colors = useColors();

  // Optimized transition object with caching
  const transitionObject = useMemo(() => {
    if (skipTransition) return null;

    const cacheKey = createTransitionCacheKey(transition, skipTransition);

    if (transitionCache.has(cacheKey)) {
      return transitionCache.get(cacheKey);
    }

    let transitionObj;
    if (typeof transition === 'object') {
      transitionObj = transition;
    } else {
      transitionObj = {
        duration: transition,
        effect: TRANSITION_EFFECT,
        timing: TRANSITION_TIMING,
      };
    }

    transitionCache.set(cacheKey, transitionObj);
    return transitionObj;
  }, [transition, skipTransition]);

  // Memoize container style to prevent recreation
  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: colors.elevation2 }, style],
    [colors.elevation2, style]
  );

  // Memoize Image props to prevent unnecessary re-renders
  const imageProps = useMemo(
    () => ({
      allowDownscaling,
      autoplay,
      cachePolicy,
      contentFit,
      contentPosition,
      priority,
      source,
      style: styles.image,
      transition: transitionObject,
      ...(testID ? { testID } : {}),
    }),
    [
      allowDownscaling,
      autoplay,
      cachePolicy,
      contentFit,
      contentPosition,
      priority,
      source,
      transitionObject,
      testID,
    ]
  );

  // Memoize callback props separately to avoid recreating imageProps
  const eventHandlers = useMemo(
    () => ({
      ...(onLoad ? { onLoad } : {}),
      ...(onError ? { onError } : {}),
    }),
    [onLoad, onError]
  );

  return (
    <View style={containerStyle}>
      <Image {...imageProps} {...eventHandlers} />
    </View>
  );
}

export const EnhancedImage = memo(EnhancedImageInternal, EnhancedImageComparison);
