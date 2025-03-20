import React from 'react';
import { StatCardProps } from '@/types/ui.types';
import InfoCard from './InfoCard';

export const StatCard = React.memo(
  ({ label, value, icon, colors, animateValue = false, onPress }: StatCardProps) => {
    return (
      <InfoCard
        title={label}
        value={value}
        icon={icon}
        iconBgColor={colors.text + '10'}
        iconColor={colors.icon}
        style={{ width: '48%', height: 90 }}
        animated={false}
        shadowSize="small"
        animateValue={animateValue}
        layoutMode="row-reversed"
        onPress={onPress}
      />
    );
  }
);

StatCard.displayName = 'StatCard';
