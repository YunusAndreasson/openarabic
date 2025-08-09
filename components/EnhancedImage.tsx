import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedImageProps } from '@/types/ui/image.types';

// Extract constants outside component for better performance
const DEFAULT_CONTENT_FIT = 'cover';
const DEFAULT_CONTENT_POSITION = 'center';
// Use supported cache policy values per expo-image types
const DEFAULT_CACHE_POLICY: EnhancedImageProps['cachePolicy'] = 'memory-disk';
const DEFAULT_PRIORITY = 'normal';
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
    prevProps.cachePolicy !== nextProps.cachePolicy ||
    prevProps.priority !== nextProps.priority ||
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

/**
 * High-performance image component optimized for loading and caching
 */
function EnhancedImageInternal({
  source,
  style,
  contentFit = DEFAULT_CONTENT_FIT,
  contentPosition = DEFAULT_CONTENT_POSITION,
  onLoad,
  onError,
  cachePolicy = DEFAULT_CACHE_POLICY,
  priority = DEFAULT_PRIORITY,
  transition,
  recyclingKey,
  testID,
}: EnhancedImageProps) {
  const colors = useColors();

  // Memoize container style to prevent recreation
  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: colors.elevation2 }, style],
    [colors.elevation2, style]
  );

  // Memoize Image props to prevent unnecessary re-renders
  const imageProps = useMemo(
    () => ({
      cachePolicy,
      contentFit,
      contentPosition,
      priority,
      transition,
      recyclingKey,
      source,
      style: styles.image,
      ...(testID ? { testID } : {}),
    }),
    [cachePolicy, contentFit, contentPosition, priority, transition, recyclingKey, source, testID]
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
