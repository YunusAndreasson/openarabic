import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useState, type FC } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';

import { SectionLabel } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { FilterSection } from '@/components/explore/FilterSection';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FilterItem {
  id: number;
  name: string;
  count?: number;
}

interface MoreFiltersSectionProps {
  difficultyItems: FilterItem[];
  lengthItems: FilterItem[];
  onSelect: (id: number, name?: string, filterType?: string) => void;
}

/**
 * Collapsible section containing Difficulty and Reading Time filters.
 * Collapsed by default to reduce visual noise on the explore page.
 */
const MoreFiltersSectionComponent: FC<MoreFiltersSectionProps> = ({
  difficultyItems,
  lengthItems,
  onSelect,
}) => {
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(prev => !prev);
  }, []);

  // Don't render if no items in either category
  if (difficultyItems.length === 0 && lengthItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggleExpanded}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${STRINGS.SECTION_MORE_FILTERS}, ${isExpanded ? 'collapse' : 'expand'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <ThemedText type="overline" style={styles.headerText}>
          {STRINGS.SECTION_MORE_FILTERS}
        </ThemedText>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          color={colors.textTertiary}
          style={styles.chevron}
        />
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {difficultyItems.length > 0 && (
            <View style={styles.filterGroup}>
              <SectionLabel title={STRINGS.SECTION_DIFFICULTY} />
              <FilterSection
                items={difficultyItems}
                onSelect={onSelect}
                filterType="difficulty"
              />
            </View>
          )}

          {lengthItems.length > 0 && (
            <View style={styles.filterGroup}>
              <SectionLabel title={STRINGS.SECTION_LENGTH} />
              <FilterSection
                items={lengthItems}
                onSelect={onSelect}
                filterType="length"
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  headerText: {
    flex: 1,
  },
  chevron: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  content: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  filterGroup: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

export const MoreFiltersSection = memo(MoreFiltersSectionComponent);
MoreFiltersSection.displayName = 'MoreFiltersSection';
