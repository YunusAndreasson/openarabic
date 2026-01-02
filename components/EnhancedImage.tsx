import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedImageProps } from '@/types/ui/image.types';

// Optimized constants - most common values are hardcoded as defaults
const IMAGE_SIZE = '100%' as const;

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  image: {
    height: IMAGE_SIZE,
    width: IMAGE_SIZE,
  },
});

/**
 * High-performance image component optimized for loading and caching
 * Uses Expo Image v3 with modern features and smart defaults
 *
 * Cache Policy: Uses 'memory-disk' by default for instant access with minimal memory footprint.
 * With allowDownscaling enabled, memory cache stores downscaled decoded bitmaps (~20KB per 72px image),
 * while disk cache stores original compressed data for persistence across app restarts.
 *
 * Downscaling: Explicitly enabled to match container size and reduce memory usage.
 */
export function EnhancedImage({
  source,
  style,
  contentFit = 'cover', // Most common value - hardcoded
  contentPosition = 'center', // Most common value - hardcoded
  onLoad,
  onError,
  cachePolicy = 'memory-disk', // Optimized: memory-disk for instant access with minimal memory (~20KB per downscaled image)
  priority = 'normal', // Most common value - hardcoded
  transition = 200, // Balanced: fast enough for UX, smooth enough for quality
  recyclingKey,
  testID,
  placeholder,
  placeholderContentFit = 'cover',
  allowDownscaling = true, // Explicit: always downscale to container size for performance
  accessibilityLabel,
  accessible,
  accessibilityHint,
}: EnhancedImageProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.elevation2 }, style]}>
      <Image
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessible={accessible}
        allowDownscaling={allowDownscaling}
        cachePolicy={cachePolicy}
        contentFit={contentFit}
        contentPosition={contentPosition}
        onError={onError}
        onLoad={onLoad}
        placeholder={placeholder}
        placeholderContentFit={placeholderContentFit}
        priority={priority}
        recyclingKey={recyclingKey}
        source={source}
        style={styles.image}
        testID={testID}
        transition={transition}
      />
    </View>
  );
}

EnhancedImage.displayName = 'EnhancedImage';
