import React from 'react';
import { StatCardProps } from '@/types/ui/layout.types';
import InfoCard from './InfoCard';
import { withOpacity } from '@/utils/colorUtils';
import { LAYOUT } from '@/constants/layout';

export const StatCard = React.memo(
  ({ label, value, icon, colors, animateValue = false, onPress }: StatCardProps) => {
    return (
      <InfoCard
        title={label}
        value={value}
        icon={icon}
        iconBgColor={withOpacity(colors.text, 0.1)}
        iconColor={colors.icon}
        style={{ width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`, height: 90 }}
        includePressAnimation={false}
        shadowSize="small"
        animateValue={animateValue}
        layoutMode="row-reversed"
        onPress={onPress}
      />
    );
  }
);

StatCard.displayName = 'StatCard';
