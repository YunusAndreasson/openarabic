import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, ImageContentPosition, ImageTransition } from 'expo-image';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { EnhancedImageProps } from '@/types/ui/image.types';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * EnhancedImage component with essential optimizations
 * - Error handling
 * - Caching
 * - Accessibility support
 * - Blur transitions
 * - Placeholder support (ThumbHash/BlurHash)
 * - Transition effects (optional)
 */
function EnhancedImageInternal({
  source,
  style,
  contentFit = 'cover',
  contentPosition = 'center',
  alt,
  onLoad,
  onError,
  transition = 300,
  skipTransition = false,
  cachePolicy = 'memory-disk',
  placeholder,
  thumbhash,
  blurRadius = 0,
  priority = 'normal',
  autoplay = true,
}: EnhancedImageProps) {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();
  const [isError, setIsError] = React.useState(false);

  // Process transition into object if it's a number, or null if skipTransition is true
  const transitionObject: ImageTransition | null = React.useMemo(() => {
    if (skipTransition) return null;
    if (typeof transition === 'object') return transition;
    return {
      duration: transition,
      effect: 'cross-dissolve',
      timing: 'ease-in-out',
    };
  }, [transition, skipTransition]);

  // Process placeholder with thumbhash support
  const processedPlaceholder = React.useMemo(() => {
    if (thumbhash) return { thumbhash };
    return placeholder;
  }, [thumbhash, placeholder]);

  const handleError = React.useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  return (
    <View style={[styles.container, { backgroundColor: colors.imagePlaceholder }, style]}>
      <Image
        source={source}
        style={styles.image}
        contentFit={contentFit}
        contentPosition={contentPosition as ImageContentPosition}
        transition={transitionObject}
        onLoad={onLoad}
        onError={handleError}
        cachePolicy={cachePolicy}
        accessible={!!alt}
        accessibilityLabel={alt}
        placeholder={processedPlaceholder}
        blurRadius={blurRadius}
        allowDownscaling={true}
        priority={priority}
        autoplay={autoplay}
      />

      {isError && (
        <View style={[styles.errorContainer, { backgroundColor: colors.imagePlaceholder }]}>
          <Ionicons
            name="alert-circle-outline"
            size={24}
            color={isDarkMode ? colors.white : colors.black}
          />
        </View>
      )}
    </View>
  );
}

// Wrap with React.memo to prevent unnecessary re-renders
export const EnhancedImage = React.memo(EnhancedImageInternal);

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
