import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';

interface ArticleSkeletonProps {
  style?: ViewStyle;
  type?: 'card' | 'compact' | 'featured';
}

/**
 * A skeleton loading component for articles
 */
export const ArticleSkeleton: React.FC<ArticleSkeletonProps> = ({ style, type = 'card' }) => {
  const colors = useColors();
  const opacity = useSharedValue(0.5);

  // Use a light gray color for skeleton background
  const skeletonColor = colors.textOverlay;

  // Set up the shimmer animation
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 600 }), withTiming(0.5, { duration: 600 })),
      -1,
      true
    );
  }, [opacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getSkeletonStyles = () => {
    switch (type) {
      case 'compact':
        return {
          container: [styles.compactContainer, { backgroundColor: colors.cardBackground }],
          image: [styles.compactImage, { backgroundColor: skeletonColor }],
          title: [styles.compactTitle, { backgroundColor: skeletonColor }],
          subtitle: [styles.compactSubtitle, { backgroundColor: skeletonColor }],
        };
      case 'featured':
        return {
          container: [styles.featuredContainer, { backgroundColor: colors.cardBackground }],
          image: [styles.featuredImage, { backgroundColor: skeletonColor }],
          title: [styles.featuredTitle, { backgroundColor: skeletonColor }],
          subtitle: [styles.featuredSubtitle, { backgroundColor: skeletonColor }],
        };
      default:
        return {
          container: [styles.container, { backgroundColor: colors.cardBackground }],
          image: [styles.image, { backgroundColor: skeletonColor }],
          title: [styles.title, { backgroundColor: skeletonColor }],
          subtitle: [styles.subtitle, { backgroundColor: skeletonColor }],
        };
    }
  };

  const skeletonStyles = getSkeletonStyles();

  return (
    <Animated.View style={[skeletonStyles.container, style]} entering={FadeIn.duration(300)}>
      <Animated.View style={[skeletonStyles.image, shimmerStyle]} />
      <View style={styles.content}>
        <Animated.View style={[skeletonStyles.title, shimmerStyle]} />
        <Animated.View style={[skeletonStyles.subtitle, shimmerStyle]} />
        {type !== 'compact' && (
          <Animated.View style={[styles.meta, shimmerStyle, { backgroundColor: skeletonColor }]} />
        )}
      </View>
    </Animated.View>
  );
};

/**
 * A row of skeleton loading components for articles
 */
export const ArticleSkeletonRow: React.FC<{
  count?: number;
  type?: 'card' | 'compact' | 'featured';
  horizontal?: boolean;
}> = ({ count = 3, type = 'compact', horizontal = true }) => {
  return (
    <View style={horizontal ? styles.horizontalRow : styles.verticalRow}>
      {Array.from({ length: count }).map((_, index) => (
        <ArticleSkeleton
          key={`skeleton-${index}`}
          type={type}
          style={horizontal ? styles.horizontalItem : styles.verticalItem}
        />
      ))}
    </View>
  );
};

// Define a constant for the small border radius to use throughout the component
const SKELETON_BORDER_RADIUS = 4;

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    ...LAYOUT.SHADOW.SMALL,
  },
  compactContainer: {
    width: 220,
    height: 220,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.SMALL,
  },
  featuredContainer: {
    width: '100%',
    height: 280,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.SMALL,
  },
  image: {
    width: '100%',
    height: 180,
  },
  compactImage: {
    width: '100%',
    height: 120,
  },
  featuredImage: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    height: 20,
    borderRadius: SKELETON_BORDER_RADIUS,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  compactTitle: {
    height: 16,
    width: '90%',
    borderRadius: SKELETON_BORDER_RADIUS,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  featuredTitle: {
    height: 24,
    borderRadius: SKELETON_BORDER_RADIUS,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  subtitle: {
    height: 16,
    width: '70%',
    borderRadius: SKELETON_BORDER_RADIUS,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  compactSubtitle: {
    height: 14,
    width: '60%',
    borderRadius: SKELETON_BORDER_RADIUS,
  },
  featuredSubtitle: {
    height: 18,
    width: '80%',
    borderRadius: SKELETON_BORDER_RADIUS,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  meta: {
    height: 14,
    width: '40%',
    borderRadius: SKELETON_BORDER_RADIUS,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  horizontalRow: {
    flexDirection: 'row',
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  verticalRow: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  horizontalItem: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  verticalItem: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
