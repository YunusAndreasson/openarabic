import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';

import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  MIN_TOUCH_TARGET,
} from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

import BaseCard from './BaseCard';
import { ThemedText } from './ThemedText';

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
  const colors = useColors();
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
        onPress={onPress}
        style={[styles.card, activeCardStyle, contentStyle]}
        shadowSize={active ? 'medium' : 'small'}
      >
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText type="heading3" colorName="headingText" style={titleStyle}>
              {title}
            </ThemedText>
            <View style={styles.metaRow}>
              {leftMeta}
              <ThemedText
                type="label"
                numberOfLines={1}
                colorName="authorText"
                style={authorStyle}
                skipDefaultColor
              >
                {author}
              </ThemedText>
              {meta}
            </View>
          </View>
          <View style={styles.iconContainer}>
            {rightElement ?? (
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={colors.textTertiary}
                style={styles.arrowIcon}
              />
            )}
          </View>
        </View>
        {children}
      </BaseCard>
    </View>
  );
};

const styles = StyleSheet.create({
  arrowIcon: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
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
    paddingTop: LAYOUT.SPACING.MICRO,
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
