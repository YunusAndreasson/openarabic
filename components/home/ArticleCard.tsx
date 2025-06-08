import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';

import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  MIN_TOUCH_TARGET,
} from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';

interface ArticleCardProps {
  title: string;
  author: string;
  meta?: React.ReactNode;
  leftMeta?: React.ReactNode;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  active?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  title,
  author,
  meta,
  leftMeta,
  onPress,
  rightElement,
  active = false,
  containerStyle,
  contentStyle,
  children,
}) => {
  const isDarkMode = useIsDarkMode();

  const activeCardStyle = React.useMemo(
    () =>
      active
        ? {
            elevation: LAYOUT.ELEVATION.MEDIUM,
            shadowOpacity: LAYOUT.OPACITY.MEDIUM,
            shadowRadius: 8,
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
      marginRight: LAYOUT.SPACING.TINY,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
    }),
    [isDarkMode]
  );

  return (
    <View style={[styles.cardContainer, containerStyle]}>
      <BaseCard
        shadowSize={active ? 'medium' : 'small'}
        style={[styles.card, activeCardStyle, contentStyle]}
        onPress={onPress}
      >
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText colorName="headingText" style={titleStyle} type="heading3">
              {title}
            </ThemedText>
            <View style={styles.metaRow}>
              {leftMeta}
              <ThemedText
                skipDefaultColor
                colorName="authorText"
                numberOfLines={1}
                style={authorStyle}
                type="label"
              >
                {author}
              </ThemedText>
              {meta}
            </View>
          </View>
          {rightElement && <View style={styles.iconContainer}>{rightElement}</View>}
        </View>
        {children}
      </BaseCard>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: MIN_TOUCH_TARGET.SIZE,
    overflow: 'hidden', // Ensure cards meet minimum touch target
  },
  cardContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
    position: 'relative',
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET.SIZE,
    padding: LAYOUT.SPACING.MEDIUM, // Ensure content area is touchable
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.TINY,
    minHeight: MIN_TOUCH_TARGET.MEDIUM, // Ensure icon area is easily touchable
    minWidth: MIN_TOUCH_TARGET.MEDIUM,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: LAYOUT.SPACING.TINY,
  },
  textContent: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
});
