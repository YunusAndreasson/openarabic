import { JSX, memo, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Pill from '@/components/Pill';
import SectionTitle from '@/components/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { ArticleCard } from '@/components/ArticleCard';
import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';

const styles = StyleSheet.create({
  filterSectionContainer: {
    // Removed margins - SectionTitle handles all section spacing
  },
  horizontalList: {
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
});

interface FilterItem {
  id: number;
  name: string;
}

interface FilterSectionProps {
  title: string;
  items: FilterItem[];
  onSelect: (id: number) => void;
}

const CompactNavCard = memo(({ label, onPress }: { label: string; onPress: () => void }) => {
  const colors = useColors();
  const [pressed, setPressed] = useState(false);
  return (
    <View style={compactCardStyles.cardContainer}>
      <BaseCard
        onPress={onPress}
        style={compactCardStyles.card}
        shadowSize="small"
        // @ts-ignore
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <View style={compactCardStyles.row}>
          <ThemedText
            type="bodyBold"
            numberOfLines={1}
            style={[compactCardStyles.label, { color: pressed ? colors.background : colors.text }]}
          >
            {label}
          </ThemedText>
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={pressed ? colors.background : colors.textTertiary}
            style={compactCardStyles.icon}
          />
        </View>
      </BaseCard>
    </View>
  );
});

const compactCardStyles = StyleSheet.create({
  cardContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: 48,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontWeight: '600',
  },
  icon: {
    marginLeft: LAYOUT.SPACING.MEDIUM,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});

const FilterSection = memo(({ title, items, onSelect }: FilterSectionProps): JSX.Element => {
  return (
    <View style={styles.filterSectionContainer}>
      <SectionTitle title={title} />
      {items.map(item => (
        <CompactNavCard
          key={`${title.toLowerCase()}-${item.id}`}
          label={capitalizeFirstLetter(item.name)}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </View>
  );
});

FilterSection.displayName = 'FilterSection';

export default FilterSection;
