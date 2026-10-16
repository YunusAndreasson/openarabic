import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedImageProps } from '@/types/ui/image.types';

/**
 * High-performance image component optimized for loading and caching.
 * Uses Expo Image with memory-disk caching and downscaling by default.
 */
export function EnhancedImage({
  source,
  style,
  contentFit = 'cover',
  transition = 200,
  recyclingKey,
  priority = 'normal',
}: EnhancedImageProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.elevation2 }, style]}>
      <Image
        allowDownscaling
        cachePolicy="memory-disk"
        contentFit={contentFit}
        contentPosition="center"
        priority={priority}
        recyclingKey={recyclingKey}
        source={source}
        style={styles.image}
        // An image already in either cache appears at once instead of fading
        // in again on every remount — FlashList recycling, tab switches.
        transition={{ duration: transition, skipOnCacheHit: 'all' }}
      />
    </View>
  );
}

EnhancedImage.displayName = 'EnhancedImage';

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
