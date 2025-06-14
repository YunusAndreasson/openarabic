import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DEFAULT_IMAGES } from '@/constants/images';
import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  useScreenWidth,
} from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import Pill from './Pill';
import { ThemedText } from './ThemedText';

// Simplified interface specifically for ArticleCard (always article variant)
interface ArticleCardProps {
  /** URL of the image to display in the card */
  imageUrl: string;
  /** Title text to display in the card */
  title: string;
  /** Category text to display in a pill on the card */
  category: string;
  /** Category to display with author (separate from pill) */
  categoryForDisplay?: string;
  /** Author name to display in the card */
  author?: string;
  /** Summary text to display in the card */
  summary?: string;
  /** Custom styling for the card */
  style?: StyleProp<ViewStyle>;
  /** Optional callback when card is pressed */
  onPress?: () => void;
}

const GOLDEN_RATIO_ADJUSTED = 1.5;

const styles = StyleSheet.create({
  authorContainer: {
    flexDirection: 'row',
    marginTop: LAYOUT.SPACING.TINY,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  image: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: '100%',
    width: '100%',
  },
  imageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: '70%',
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
  },
  summaryContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

function ArticleCardComponent({
  title,
  author,
  imageUrl,
  category,
  categoryForDisplay,
  summary,
  style,
  onPress,
}: ArticleCardProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const screenWidth = useScreenWidth();

  const imageHeight = useMemo(
    () => Math.round((screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    [screenWidth]
  );

  const gradientColors = useMemo(() => {
    if (isDarkMode) {
      return [
        withOpacity(colors.background, 0),
        withOpacity(colors.background, 0.5),
        withOpacity(colors.background, 0.9),
        colors.card,
      ] as const;
    }
    return ['transparent', 'transparent', 'transparent', 'transparent'] as const;
  }, [colors.background, colors.card, isDarkMode]);

  const titleStyle = useMemo(
    () => ({
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const authorStyle = useMemo(
    () => ({
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.ACCENT, isDarkMode),
    }),
    [isDarkMode]
  );

  const summaryStyle = useMemo(
    () => ({
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
      letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
    }),
    [isDarkMode]
  );

  return (
    <BaseCard style={style} onPress={onPress}>
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <EnhancedImage
          alt={`Image for ${title}`}
          contentFit="cover"
          style={styles.image}
          placeholder={{
            thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
          }}
          source={imageUrl}
        />
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 0, y: 1.0 }}
          style={styles.gradient}
        />
      </View>

      <View style={styles.pillContainer}>
        <Pill id={category} label={capitalizeFirstLetter(category)} variant="category" />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <ThemedText colorName="headingText" numberOfLines={2} style={titleStyle} type="heading3">
            {title}
          </ThemedText>
        </View>

        <View style={styles.authorContainer}>
          <ThemedText colorName="authorText" numberOfLines={1} style={authorStyle} type="label">
            {author} • {categoryForDisplay ? capitalizeFirstLetter(categoryForDisplay) : ''}
          </ThemedText>
        </View>

        <View style={styles.summaryContainer}>
          <ThemedText colorName="captionText" type="caption" style={summaryStyle}>
            {summary}
          </ThemedText>
        </View>
      </View>
    </BaseCard>
  );
}

const ArticleCard = memo(ArticleCardComponent);

export default ArticleCard;
