import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import type { StatCardProps } from '@/types/ui/layout.types';
import { withOpacity } from '@/utils/colorUtils';

import InfoCard from './InfoCard';

const styles = StyleSheet.create({
  cardStyle: {
    height: 90,
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
});

export const StatCard = memo(({ label, value, icon, colors, onPress }: StatCardProps) => {
  return (
    <InfoCard
      title={label}
      value={value}
      icon={icon}
      iconBgColor={withOpacity(colors.text, 0.1)}
      iconColor={colors.icon}
      style={styles.cardStyle}
      includePressAnimation={false}
      shadowSize="small"
      layoutMode="row-reversed"
      onPress={onPress}
    />
  );
});

StatCard.displayName = 'StatCard';
