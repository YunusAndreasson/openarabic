import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';

import { DEFAULT_IMAGES } from '@/constants/images';
import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  useScreenWidth,
} from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type {
  ThemedCardProps as BaseThemedCardProps,
  ArticleCardProps,
} from '@/types/ui/card.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import Pill from './Pill';
import { ThemedText } from './ThemedText';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 * Enhanced with sophisticated color relationships and micro-typography optimizations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 */

const GOLDEN_RATIO_ADJUSTED = 1.5;

// Move styles outside component to prevent recreation
const styles = StyleSheet.create({
  authorContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 0,
    marginTop: LAYOUT.SPACING.TINY,
    position: 'relative',
    zIndex: 20,
  },

  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
    zIndex: 15,
    ...Platform.select({
      android: {
        paddingBottom: LAYOUT.SPACING.MEDIUM + 4, // Add extra padding at bottom for Android
      },
    }),
  },

  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%', // Only bottom 40% for subtle transition
    zIndex: 10, // Above image but below content
  },
  image: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: '100%',
    width: '100%',
    zIndex: 1,
  },
  imageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  loadingComponentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: '70%',
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    zIndex: 25,
  },
  summaryContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.SMALL,
    position: 'relative',
    zIndex: 20,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
    position: 'relative',
    zIndex: 20,
  },
});

type ThemedCardProps = Omit<BaseThemedCardProps, 'onPress'> & {
  handlePress?: () => void;
  onPress?: () => void;
  fullSummary?: boolean;
} & ArticleCardProps;

// Loading component moved outside to prevent recreation
const LoadingComponent = ({
  isDarkMode,
  colors,
  style: additionalStyle,
}: {
  isDarkMode: boolean;
  colors: ThemeColors;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      styles.loadingComponentContainer,
      additionalStyle,
      { backgroundColor: isDarkMode ? colors.cardBackground : colors.overlay },
    ]}
  >
    <ActivityIndicator color={colors.tint} size="large" />
  </View>
);

function ThemedCardComponent(props: ThemedCardProps): React.JSX.Element {
  const { handlePress, onPress, style, isLoading = false } = props;
  const pressHandler = onPress || handlePress;

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const screenWidth = useScreenWidth();
  const imageHeight = useMemo(
    () => Math.round((screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    [screenWidth]
  );
  const dynamicStyles = useMemo(
    () => ({
      imageContainer: { height: imageHeight },
      loadingComponentContainer: { height: imageHeight },
    }),
    [imageHeight]
  );

  const baseColor = colors.background;

  // Memoize gradient colors with balanced intensity for both modes
  const gradientColors = useMemo(() => {
    if (isDarkMode) {
      // Dark mode gradient with similar intensity to light mode
      return [
        withOpacity(baseColor, 0),
        withOpacity(baseColor, 0.5),
        withOpacity(baseColor, 0.9),
        colors.card,
      ] as const;
    } else {
      // Light mode: no gradient (completely transparent)
      return ['transparent', 'transparent', 'transparent', 'transparent'] as const;
    }
  }, [baseColor, colors.card, isDarkMode]);

  // Simple gradient props - same positioning for both modes
  const gradientProps = useMemo(
    () => ({
      colors: gradientColors,
      start: { x: 0, y: 0.1 },
      end: { x: 0, y: 1.0 },
      pointerEvents: 'none' as const,
    }),
    [gradientColors]
  );

  // Enhanced text styles with semantic colors and simplified typography
  const titleStyle = useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const authorStyle = useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const summaryStyle = useMemo(
    () => ({
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
      letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY, isDarkMode),
    }),
    [isDarkMode]
  );

  // Memoize article content with enhanced typography
  const articleContent = useMemo(() => {
    return (
      <>
        <View style={[styles.imageContainer, dynamicStyles.imageContainer]}>
          <EnhancedImage
            allowDownscaling={false}
            alt={`Image for ${props.title || 'Article'}`}
            blurRadius={0}
            cachePolicy="memory-disk"
            contentFit="cover"
            prefetch={true}
            priority="high"
            skipTransition={true}
            style={styles.image}
            placeholder={
              props.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
            source={props.imageUrl || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER}
          />

          <LinearGradient {...gradientProps} style={styles.gradient} />
        </View>

        {props.category ? (
          <View style={styles.pillContainer}>
            <Pill id={props.category} label={props.category} variant="category" />
          </View>
        ) : null}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText
              colorName="headingText"
              numberOfLines={2}
              style={titleStyle}
              type="heading3"
            >
              {props.title}
            </ThemedText>
          </View>

          <View style={styles.authorContainer}>
            <ThemedText colorName="authorText" numberOfLines={1} style={authorStyle} type="label">
              {props.author} • {props.categoryForDisplay}
            </ThemedText>
          </View>

          {props.summary ? (
            <View style={styles.summaryContainer}>
              <ThemedText
                colorName="captionText"
                type="caption"
                {...(!props.fullSummary ? { numberOfLines: 3 } : {})}
                style={summaryStyle}
              >
                {props.summary}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </>
    );
  }, [
    props.title,
    props.imageUrl,
    props.placeholder,
    props.fullSummary,
    props.category,
    props.author,
    props.summary,
    gradientProps,
    titleStyle,
    authorStyle,
    summaryStyle,
  ]);

  if (isLoading) {
    return (
      <BaseCard
        isLoading={true}
        loadingComponent={
          <LoadingComponent
            colors={colors}
            isDarkMode={isDarkMode}
            style={dynamicStyles.loadingComponentContainer}
          />
        }
        style={style as StyleProp<ViewStyle>}
        onPress={pressHandler}
      >
        <View />
      </BaseCard>
    );
  }

  return (
    <BaseCard
      includePressAnimation={true}
      style={style as StyleProp<ViewStyle>}
      onPress={pressHandler}
    >
      {articleContent}
    </BaseCard>
  );
}

const ThemedCard = memo(ThemedCardComponent);

export default ThemedCard;
