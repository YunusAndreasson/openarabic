import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StatCategory } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

interface StatCardProps {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  category: StatCategory;
  onPress?: (category: StatCategory) => void;
}

export const StatCard = memo(
  ({ value, label, icon, iconColor, bgColor, category, onPress }: StatCardProps) => {
    const colors = useColors();

    const handlePress = () => {
      if (onPress) {
        onPress(category);
      }
    };

    return (
      <BaseCard
        onPress={handlePress}
        style={styles.statCard}
        shadowSize="small"
        includePressAnimation={true}
      >
        <View style={styles.cardContent}>
          {/* Icon container */}
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>

          {/* Main content */}
          <View style={styles.contentCenter}>
            <ThemedText type="heading2" weight="bold" style={styles.statValue}>
              {value.toLocaleString()}
            </ThemedText>
            <ThemedText type="body" weight="medium" variant="secondary" style={styles.statLabel}>
              {label}
            </ThemedText>
          </View>

          {/* Navigation indicator */}
          <View style={styles.contentRight}>
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={colors.textTertiary}
              style={styles.navigationIcon}
            />
          </View>
        </View>
      </BaseCard>
    );
  }
);

StatCard.displayName = 'StatCard';

const styles = StyleSheet.create({
  statCard: {
    width: '48%',
    minWidth: 150,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    minHeight: 72,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCenter: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contentRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: LAYOUT.SPACING.XLARGE,
    marginRight: LAYOUT.SPACING.TINY,
  },
  statValue: {
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  statLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
  },
  navigationIcon: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});
