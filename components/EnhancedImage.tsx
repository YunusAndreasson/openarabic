import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { EnhancedImageProps } from '@/types/ui/image.types';
import { LoadingContainer } from './Loader';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * EnhancedImage component with essential optimizations
 * - Loading state
 * - Error handling
 * - Basic caching
 * - Accessibility support
 */
function EnhancedImageInternal({
  source,
  style,
  contentFit = 'cover',
  showLoadingIndicator = true,
  alt,
  onLoad,
  onError,
  transition = 300,
  cachePolicy = 'memory-disk',
}: EnhancedImageProps) {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  const handleImageLoad = React.useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setIsError(true);
    onError?.();
  }, [onError]);

  return (
    <View style={[styles.container, { backgroundColor: colors.imagePlaceholder }, style]}>
      <Image
        source={source}
        style={styles.image}
        contentFit={contentFit}
        transition={transition}
        onLoad={handleImageLoad}
        onError={handleError}
        cachePolicy={cachePolicy}
        accessible={!!alt}
        accessibilityLabel={alt}
      />

      {isLoading && showLoadingIndicator && (
        <View style={[styles.loadingContainer, { backgroundColor: colors.imagePlaceholder }]}>
          <LoadingContainer size="small" />
        </View>
      )}

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
    position: 'relative',
    overflow: 'hidden',
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
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
