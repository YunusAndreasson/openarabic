import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedImageProps } from '@/types/ui/image.types';

// Optimized constants - most common values are hardcoded as defaults
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
    prevProps.testID !== nextProps.testID ||
    prevProps.allowDownscaling !== nextProps.allowDownscaling
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
 * Uses Expo Image v3 with modern features and smart defaults
 */
function EnhancedImageInternal({
  source,
  style,
  contentFit = 'cover', // Most common value - hardcoded
  contentPosition = 'center', // Most common value - hardcoded
  onLoad,
  onError,
  cachePolicy = 'memory-disk', // Most common value - hardcoded
  priority = 'normal', // Most common value - hardcoded
  transition = 300, // Smooth cross-fade by default
  recyclingKey,
  testID,
  placeholder,
  placeholderContentFit = 'cover',
  allowDownscaling,
}: EnhancedImageProps) {
  const colors = useColors();

  // Memoize container style with minimal dependencies
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
      ...(placeholder ? { placeholder } : {}),
      ...(placeholder ? { placeholderContentFit } : {}),
      ...(testID ? { testID } : {}),
      ...(allowDownscaling !== undefined ? { allowDownscaling } : {}),
    }),
    [
      cachePolicy,
      contentFit,
      contentPosition,
      priority,
      transition,
      recyclingKey,
      source,
      placeholder,
      placeholderContentFit,
      testID,
      allowDownscaling,
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
