import { Image } from 'expo-image';
import React, { useMemo, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { EnhancedImageProps } from '@/types/ui/image.types';

function EnhancedImageInternal({
  source,
  style,
  contentFit = 'cover',
  contentPosition = 'center',
  onLoad,
  transition = 300,
  skipTransition = false,
  cachePolicy = 'disk',
  placeholder,
  allowDownscaling = true,
  priority = 'normal',
  autoplay = true,
}: EnhancedImageProps) {
  const colors = useColors();

  const transitionObject = useMemo(() => {
    if (skipTransition) return null;
    if (typeof transition === 'object') return transition;
    return {
      duration: transition,
      effect: 'cross-dissolve' as const,
      timing: 'ease-in-out' as const,
    };
  }, [transition, skipTransition]);

  return (
    <View style={[styles.container, { backgroundColor: colors.imagePlaceholder }, style]}>
      <Image
        allowDownscaling={allowDownscaling}
        autoplay={autoplay}
        cachePolicy={cachePolicy}
        contentFit={contentFit}
        contentPosition={contentPosition}
        placeholder={placeholder}
        priority={priority}
        source={source}
        style={styles.image}
        transition={transitionObject}
        onLoad={onLoad}
      />
    </View>
  );
}

export const EnhancedImage = memo(EnhancedImageInternal);

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
