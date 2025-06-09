import { Ionicons } from '@expo/vector-icons';
import type { ImageTransition } from 'expo-image';
import { Image } from 'expo-image';
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { EnhancedImageProps } from '@/types/ui/image.types';

function EnhancedImageInternal({
  source,
  style,
  contentFit = 'cover',
  contentPosition = 'center',
  onLoad,
  onError,
  transition = 300,
  skipTransition = false,
  cachePolicy = 'memory-disk',
  placeholder,
  thumbhash,
  blurRadius = 0,
  allowDownscaling = true,
  priority = 'normal',
  autoplay = true,
  prefetch = false,
}: EnhancedImageProps) {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();
  const [isError, setIsError] = useState(false);

  // Process transition into object if it's a number, or null if skipTransition is true
  const transitionObject: ImageTransition | null = useMemo(() => {
    if (skipTransition) return null;
    if (typeof transition === 'object') return transition;
    return {
      duration: transition,
      effect: 'cross-dissolve',
      timing: 'ease-in-out',
    };
  }, [transition, skipTransition]);

  // Process placeholder with thumbhash support
  const processedPlaceholder = useMemo(() => {
    // Only use placeholder while loading, not as fallback
    if (thumbhash && !isError) return { thumbhash };
    if (!isError) return placeholder;
    return undefined;
  }, [thumbhash, placeholder, isError]);

  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  useEffect(() => {
    if (prefetch) {
      try {
        // Fire and forget
        Image.prefetch?.(source);
      } catch {
        /* noop */
      }
    }
  }, [prefetch, source]);

  return (
    <View style={[styles.container, { backgroundColor: colors.imagePlaceholder }, style]}>
      <Image
        allowDownscaling={allowDownscaling}
        autoplay={autoplay}
        blurRadius={blurRadius}
        cachePolicy={cachePolicy}
        contentFit={contentFit}
        contentPosition={contentPosition}
        placeholder={processedPlaceholder}
        priority={priority}
        source={source}
        style={styles.image}
        transition={transitionObject}
        onError={handleError}
        onLoad={onLoad}
      />

      {isError ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.imagePlaceholder }]}>
          <Ionicons
            color={isDarkMode ? colors.white : colors.black}
            name="alert-circle-outline"
            size={24}
          />
        </View>
      ) : null}
    </View>
  );
}

// Wrap with React.memo to prevent unnecessary re-renders
export const EnhancedImage = memo(EnhancedImageInternal);

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    overflow: 'hidden',
    position: 'relative',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
