import React from 'react';
import InfoCard from '../InfoCard';
import { useColors } from '../../hooks/useColors';

interface CategoryInfoCardProps {
  category: 'total' | 'mastered' | 'learning' | 'due';
  hideTitle?: boolean;
  onPress?: () => void;
}

/**
 * A component that displays educational information about each vocabulary category
 * from a spaced repetition system (SRS) perspective.
 */
const CategoryInfoCard = React.memo(
  ({ category, hideTitle = false, onPress }: CategoryInfoCardProps) => {
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
            bgColor: colors.text + '30',
          };
        case 'mastered':
          return {
            title: 'Mastered Words',
            description:
              'Words with long review intervals that have been successfully recalled multiple times and stored in long-term memory.',
            icon: 'checkmark-circle',
            iconColor: colors.success,
            bgColor: colors.success + '30',
          };
        case 'learning':
          return {
            title: 'Learning Words',
            description:
              'Words with shorter review intervals still being committed to memory. Regular practice strengthens neural connections and improves retention.',
            icon: 'school',
            iconColor: colors.info,
            bgColor: colors.info + '30',
          };
        case 'due':
          return {
            title: 'Review Words',
            description:
              'Words scheduled for review today based on spaced repetition algorithms. Reviewing at optimal intervals maximizes retention while minimizing study time.',
            icon: 'alarm',
            iconColor: colors.warning,
            bgColor: colors.warning + '30',
          };
        default:
          return {
            title: 'Total Words',
            description: 'Words being learned through spaced repetition.',
            icon: 'book',
            iconColor: colors.text,
            bgColor: colors.text + '30',
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
  }
);

CategoryInfoCard.displayName = 'CategoryInfoCard';

export default CategoryInfoCard;
