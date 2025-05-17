import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

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
  const activeCardStyle = active
    ? {
        borderLeftWidth: 3,
        borderColor: colors.tint,
        elevation: 6,
        shadowOpacity: LAYOUT.OPACITY.MEDIUM,
        shadowRadius: 8,
      }
    : undefined;

  return (
    <View style={[styles.cardContainer, containerStyle]}>
      <BaseCard
        onPress={onPress}
        style={[styles.card, activeCardStyle, contentStyle]}
        shadowSize={active ? 'medium' : 'small'}
      >
        <View style={styles.cardContent}>
          <View style={styles.textContent}>
            <ThemedText type="bodyBold" style={styles.titleText}>
              {title}
            </ThemedText>
            <View style={styles.metaRow}>
              {leftMeta}
              <ThemedText
                type="label"
                numberOfLines={1}
                style={[styles.authorText, { color: colors.authorText }]}
                skipDefaultColor
              >
                {author}
              </ThemedText>
              {meta}
            </View>
          </View>
          <View style={styles.iconContainer}>
            {rightElement ?? (
              <ThemedText type="heading3" colorName="textTertiary" style={styles.arrowText}>
                →
              </ThemedText>
            )}
          </View>
        </View>
        {children}
      </BaseCard>
    </View>
  );
};

const styles = StyleSheet.create({
  arrowText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  authorText: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  card: {
    overflow: 'hidden',
  },
  cardContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: LAYOUT.SPACING.XLARGE,
      minWidth: LAYOUT.SPACING.XLARGE,
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
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});
