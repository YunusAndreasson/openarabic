import React from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  MIN_TOUCH_TARGET,
} from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

interface ArticleCardProps {
  title: string;
  author: string;
  onPress?: () => void;
  active?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  title,
  author,
  onPress,
  active = false,
}) => {
  const isDarkMode = useIsDarkMode();

  const activeCardStyle = React.useMemo(
    () =>
      active
        ? {
            elevation: LAYOUT.ELEVATION.MEDIUM,
            shadowOpacity: LAYOUT.OPACITY.MEDIUM,
          }
        : undefined,
    [active]
  );

  // Enhanced title and author styles with semantic colors
  const titleStyle = React.useMemo(
    () => ({
      marginBottom: LAYOUT.SPACING.TINY,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.LARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.lineHeightMultiplier,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const authorStyle = React.useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
    }),
    [isDarkMode]
  );

  return (
    <View style={styles.cardContainer}>
      <BaseCard
        shadowSize={active ? 'medium' : 'small'}
        style={[styles.card, activeCardStyle]}
        onPress={onPress}
      >
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText colorName="headingText" style={titleStyle} type="heading3">
              {title}
            </ThemedText>
            <ThemedText
              skipDefaultColor
              colorName="authorText"
              numberOfLines={1}
              style={authorStyle}
              type="label"
            >
              {author}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: MIN_TOUCH_TARGET.SIZE,
    overflow: 'hidden',
  },
  cardContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
    position: 'relative',
  },
  cardContent: {
    flexDirection: 'row',
    minHeight: MIN_TOUCH_TARGET.SIZE,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  textContent: {
    flex: 1,
  },
});
