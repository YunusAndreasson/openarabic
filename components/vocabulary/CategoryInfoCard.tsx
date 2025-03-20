import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import BaseCard from '../BaseCard';

interface CategoryInfoCardProps {
  category: 'total' | 'mastered' | 'learning' | 'due';
  hideTitle?: boolean;
}

/**
 * A component that displays educational information about each vocabulary category
 * from a spaced repetition system (SRS) perspective.
 */
const CategoryInfoCard = React.memo(({ category, hideTitle = false }: CategoryInfoCardProps) => {
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
    <BaseCard style={styles.container} shadowSize="small" animated={false}>
      {!hideTitle && (
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: info.bgColor }]}>
            <Ionicons name={info.icon as any} size={22} color={info.iconColor} />
          </View>
          <ThemedText style={styles.title}>{info.title}</ThemedText>
        </View>
      )}
      <View style={[styles.contentRow, !hideTitle && { marginTop: LAYOUT.SPACING.SMALL }]}>
        {hideTitle && (
          <View style={[styles.iconContainer, { backgroundColor: info.bgColor }]}>
            <Ionicons name={info.icon as any} size={22} color={info.iconColor} />
          </View>
        )}
        <ThemedText style={[styles.description, hideTitle && { flex: 1 }]}>
          {info.description}
        </ThemedText>
      </View>
    </BaseCard>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
    alignSelf: 'flex-start',
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

CategoryInfoCard.displayName = 'CategoryInfoCard';

export default CategoryInfoCard;
