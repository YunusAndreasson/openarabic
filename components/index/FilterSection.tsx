import { JSX, memo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';

import Pill from '@/components/Pill';
import SectionTitle from '@/components/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  filterSectionContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  horizontalList: {
    paddingVertical: LAYOUT.SPACING.TINY,
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

const FilterSection = memo(({ title, items, onSelect }: FilterSectionProps): JSX.Element => {
  return (
    <View style={styles.filterSectionContainer}>
      <SectionTitle title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {items.map(item => (
          <Pill
            key={`${title.toLowerCase()}-${item.id}`}
            id={item.id}
            label={capitalizeFirstLetter(item.name)}
            isSelected={false}
            onSelect={id => onSelect(Number(id))}
            variant="filter"
          />
        ))}
      </ScrollView>
    </View>
  );
});

FilterSection.displayName = 'FilterSection';

export default FilterSection;
