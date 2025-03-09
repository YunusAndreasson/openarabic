import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';

interface CategorySelectorProps {
  categories: { id: number; name: string }[];
  selectedCategory: number | null;
  onSelectCategory: (id: number) => void;
}

/**
 * Component for selecting categories
 */
const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View testID="category-selector">
      {categories.map(category => (
        <View
          key={category.id}
          testID={`category-${category.id}`}
          style={[styles.categoryItem, selectedCategory === category.id && styles.selectedCategory]}
          onTouchEnd={() => onSelectCategory(category.id)}
        >
          <ThemedText>{category.name}</ThemedText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  categoryItem: {
    padding: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  selectedCategory: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default CategorySelector;
