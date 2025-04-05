import React, { memo } from 'react';

import { withOpacity } from '@/utils/colorUtils';

import { useColors } from '../../hooks/useColors';
import InfoCard from '../InfoCard';

interface CategoryInfoCardProps {
  category: 'total' | 'mastered' | 'learning';
  hideTitle?: boolean;
  onPress?: () => void;
}

/**
 * A component that displays educational information about each vocabulary category
 * from a spaced repetition system (SRS) perspective.
 */
const CategoryInfoCard = memo(({ category, hideTitle = false, onPress }: CategoryInfoCardProps) => {
  const colors = useColors();

  // Define category-specific content
  const getCategoryInfo = () => {
    switch (category) {
      case 'total':
        return {
          title: 'Total Words',
          description:
            'Words added to your spaced repetition system, scheduled for review based on memory strength.',
          icon: 'book',
          iconColor: colors.text,
          bgColor: withOpacity(colors.text, 0.19), // 30 in hex is approx 19% opacity
        };
      case 'mastered':
        return {
          title: 'Mastered Words',
          description:
            'Words with long review intervals that have been successfully recalled multiple times and stored in long-term memory.',
          icon: 'checkmark-circle',
          iconColor: colors.success,
          bgColor: withOpacity(colors.success, 0.19),
        };
      case 'learning':
        return {
          title: 'Learning Words',
          description:
            'Words with shorter review intervals still being committed to memory. Regular practice strengthens neural connections and improves retention.',
          icon: 'school',
          iconColor: colors.info,
          bgColor: withOpacity(colors.info, 0.19),
        };
      default:
        return {
          title: 'Total Words',
          description: 'Words being learned through spaced repetition.',
          icon: 'book',
          iconColor: colors.text,
          bgColor: withOpacity(colors.text, 0.19),
        };
    }
  };

  const info = getCategoryInfo();

  return (
    <InfoCard
      title={info.title}
      description={info.description}
      icon={info.icon}
      iconColor={info.iconColor}
      iconBgColor={info.bgColor}
      hideTitle={hideTitle}
      shadowSize="small"
      includePressAnimation={false}
      onPress={onPress}
    />
  );
});

CategoryInfoCard.displayName = 'CategoryInfoCard';

export default CategoryInfoCard;
