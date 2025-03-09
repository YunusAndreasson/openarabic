import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useShimmerAnimation } from '@/hooks/animations';

interface ArticleSkeletonProps {
  style?: ViewStyle;
  type?: 'card' | 'compact' | 'featured';
}

// Define a constant for the small border radius to use throughout the component
const SKELETON_BORDER_RADIUS = 4;

/**
 * A skeleton loading component for articles
 */
export const ArticleSkeleton: React.FC<ArticleSkeletonProps> = ({ style, type = 'card' }) => {
  const colors = useColors();
  const { animatedStyle, startAnimation } = useShimmerAnimation(600, 0.5, 0.8);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  // Use a light gray color for skeleton background
  const skeletonColor = colors.textOverlay;

  // Determine which styles to use based on type
  let containerStyle, imageStyle, titleStyle, subtitleStyle;

  switch (type) {
    case 'compact':
      containerStyle = [styles.compactContainer, { backgroundColor: colors.cardBackground }];
      imageStyle = [styles.compactImage, { backgroundColor: skeletonColor }];
      titleStyle = [styles.compactTitle, { backgroundColor: skeletonColor }];
      subtitleStyle = [styles.compactSubtitle, { backgroundColor: skeletonColor }];
      break;
    case 'featured':
      containerStyle = [styles.featuredContainer, { backgroundColor: colors.cardBackground }];
      imageStyle = [styles.featuredImage, { backgroundColor: skeletonColor }];
      titleStyle = [styles.featuredTitle, { backgroundColor: skeletonColor }];
      subtitleStyle = [styles.featuredSubtitle, { backgroundColor: skeletonColor }];
      break;
    default:
      containerStyle = [styles.container, { backgroundColor: colors.cardBackground }];
      imageStyle = [styles.image, { backgroundColor: skeletonColor }];
      titleStyle = [styles.title, { backgroundColor: skeletonColor }];
      subtitleStyle = [styles.subtitle, { backgroundColor: skeletonColor }];
  }

  return (
    <Animated.View style={[containerStyle, style]} entering={FadeIn.duration(300)}>
      <Animated.View style={[imageStyle, animatedStyle]} />
      <View style={styles.content}>
        <Animated.View style={[titleStyle, animatedStyle]} />
        <Animated.View style={[subtitleStyle, animatedStyle]} />
        {type !== 'compact' && (
          <Animated.View style={[styles.meta, { backgroundColor: skeletonColor }, animatedStyle]} />
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
