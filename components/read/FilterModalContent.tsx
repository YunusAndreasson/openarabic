import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, type FC } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';
import Pill from '@ui/Pill';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import {
  DATE_RANGE_OPTIONS,
  DIFFICULTY_OPTIONS,
  useFilterModal,
} from '@/hooks/articles/useFilterModal';
import { useColors } from '@/hooks/theme/useColors';
import type { Author } from '@/types/articles.types';

interface FilterModalProps {
  availableAuthors: Author[];
}

const FilterModal: FC<FilterModalProps> = ({ availableAuthors }) => {
  const colors = useColors();
  const {
    filters,
    activeFiltersCount,
    expandedSections,
    toggleSection,
    handleAuthorToggle,
    handleDifficultySelect,
    handleDateRangeSelect,
    handleClearAll,
    authorChunks,
    selectedDifficultyOption,
    selectedDateRangeOption,
    selectedAuthorsText,
  } = useFilterModal(availableAuthors);

  const handleToggleAuthors = useCallback(() => {
    toggleSection('authors');
  }, [toggleSection]);

  const handleToggleDifficulty = useCallback(() => {
    toggleSection('difficulty');
  }, [toggleSection]);

  const handleToggleDateRange = useCallback(() => {
    toggleSection('dateRange');
  }, [toggleSection]);

  const selectAuthor = useCallback(
    (authorId: number) => () => {
      handleAuthorToggle(authorId);
    },
    [handleAuthorToggle]
  );

  const selectDifficulty = useCallback(
    (range: [number, number]) => () => {
      handleDifficultySelect(range);
    },
    [handleDifficultySelect]
  );

  const selectDateRange = useCallback(
    (range: (typeof DATE_RANGE_OPTIONS)[number]['key']) => () => {
      handleDateRangeSelect(range);
    },
    [handleDateRangeSelect]
  );

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeFiltersCount > 0 && (
          <BaseCard shadowSize="small" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryBadge, { backgroundColor: colors.tint }]}>
                <ThemedText type="caption" weight="bold" colorName="background">
                  {activeFiltersCount}
                </ThemedText>
              </View>
              <ThemedText type="body" weight="semibold" colorName="tint">
                {activeFiltersCount === 1 ? 'Active Filter' : 'Active Filters'}
              </ThemedText>
              <Pressable onPress={handleClearAll} style={styles.clearAllButton}>
                <ThemedText type="label" colorName="warning" weight="semibold">
                  {STRINGS.RESET_FILTERS}
                </ThemedText>
              </Pressable>
            </View>
          </BaseCard>
        )}

        <BaseCard shadowSize="small" style={styles.card}>
          <View style={styles.filterSection}>
            <Pressable
              style={[
                styles.filterRow,
                expandedSections.authors && [
                  styles.filterRowExpanded,
                  { backgroundColor: colors.elevation2 },
                ],
                { borderBottomColor: colors.borderOverlay },
              ]}
              onPress={handleToggleAuthors}
            >
              <View style={styles.filterRowContent}>
                <View style={styles.filterRowLeft}>
                  <View
                    style={[styles.filterIconContainer, { backgroundColor: colors.elevation2 }]}
                  >
                    <Ionicons
                      name="person"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.filterTextContainer}>
                    <ThemedText type="body" weight="semibold">
                      {STRINGS.AUTHORS}
                    </ThemedText>
                    <ThemedText type="caption" colorName="secondaryText">
                      {selectedAuthorsText}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.expandIndicator}>
                  <Ionicons
                    name={expandedSections.authors ? 'chevron-up' : 'chevron-down'}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    color={colors.tint}
                  />
                </View>
              </View>
            </Pressable>

            {expandedSections.authors && (
              <View style={[styles.expandedContent, { backgroundColor: colors.elevation2 }]}>
                <View style={styles.pillGrid}>
                  {authorChunks.map(chunk => (
                    <View key={chunk[0]?.id || chunk.length} style={styles.authorChunk}>
                      {chunk.map(author => (
                        <Pill
                          key={author.id}
                          id={author.id}
                          label={author.name}
                          isSelected={filters.authorIds.includes(author.id)}
                          onSelect={selectAuthor(author.id)}
                          variant="filter"
                          pillStyle={styles.filterPill}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.filterSection}>
            <Pressable
              style={[
                styles.filterRow,
                expandedSections.difficulty && [
                  styles.filterRowExpanded,
                  { backgroundColor: colors.elevation2 },
                ],
                { borderBottomColor: colors.borderOverlay },
              ]}
              onPress={handleToggleDifficulty}
            >
              <View style={styles.filterRowContent}>
                <View style={styles.filterRowLeft}>
                  <View
                    style={[styles.filterIconContainer, { backgroundColor: colors.elevation2 }]}
                  >
                    <Ionicons
                      name="trending-up"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.filterTextContainer}>
                    <ThemedText type="body" weight="semibold">
                      {STRINGS.DIFFICULTY}
                    </ThemedText>
                    <ThemedText type="caption" colorName="secondaryText">
                      {selectedDifficultyOption?.label}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.expandIndicator}>
                  <Ionicons
                    name={expandedSections.difficulty ? 'chevron-up' : 'chevron-down'}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    color={colors.tint}
                  />
                </View>
              </View>
            </Pressable>

            {expandedSections.difficulty && (
              <View style={[styles.expandedContent, { backgroundColor: colors.elevation2 }]}>
                <View style={styles.pillGrid}>
                  {DIFFICULTY_OPTIONS.map(option => (
                    <Pill
                      key={option.key}
                      id={option.key}
                      label={option.label}
                      isSelected={
                        option.range[0] === filters.difficultyRange[0] &&
                        option.range[1] === filters.difficultyRange[1]
                      }
                      onSelect={selectDifficulty(option.range)}
                      variant="filter"
                      pillStyle={styles.filterPill}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.filterSection}>
            <Pressable
              style={[
                styles.filterRow,
                styles.lastFilterRow,
                expandedSections.dateRange && [
                  styles.filterRowExpanded,
                  { backgroundColor: colors.elevation2 },
                ],
              ]}
              onPress={handleToggleDateRange}
            >
              <View style={styles.filterRowContent}>
                <View style={styles.filterRowLeft}>
                  <View
                    style={[styles.filterIconContainer, { backgroundColor: colors.elevation2 }]}
                  >
                    <Ionicons
                      name="calendar"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.filterTextContainer}>
                    <ThemedText type="body" weight="semibold">
                      {STRINGS.DATE_RANGE}
                    </ThemedText>
                    <ThemedText type="caption" colorName="secondaryText">
                      {selectedDateRangeOption?.label}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.expandIndicator}>
                  <Ionicons
                    name={expandedSections.dateRange ? 'chevron-up' : 'chevron-down'}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    color={colors.tint}
                  />
                </View>
              </View>
            </Pressable>

            {expandedSections.dateRange && (
              <View style={[styles.expandedContent, { backgroundColor: colors.elevation2 }]}>
                <View style={styles.pillGrid}>
                  {DATE_RANGE_OPTIONS.map(option => (
                    <Pill
                      key={option.key}
                      id={option.key}
                      label={option.label}
                      isSelected={filters.dateRange === option.key}
                      onSelect={selectDateRange(option.key)}
                      variant="filter"
                      pillStyle={styles.filterPill}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        </BaseCard>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: LAYOUT.SCREEN_EDGE_PADDING, paddingBottom: LAYOUT.SPACING.LARGE },
  summaryCard: { marginBottom: LAYOUT.SPACING.SMALL, padding: LAYOUT.SPACING.MEDIUM },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.SPACING.TINY },
  summaryBadge: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: LAYOUT.BUTTON.ICON_SIZE.LARGE,
    height: LAYOUT.BUTTON.ICON_SIZE.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllButton: {
    marginLeft: 'auto',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
  },
  card: { marginBottom: LAYOUT.SPACING.MEDIUM, padding: LAYOUT.SPACING.MEDIUM },
  filterSection: { marginBottom: LAYOUT.SPACING.SMALL },
  filterRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TOUCH_TARGET.LARGE,
    // Remove extra vertical padding here; use content padding instead
  },
  filterRowExpanded: {},
  lastFilterRow: { borderBottomWidth: 0 },
  filterRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  filterIconContainer: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTextContainer: { flex: 1, gap: LAYOUT.SPACING.TINY },
  expandIndicator: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: LAYOUT.SPACING.SMALL },
  filterPill: { marginBottom: 0, marginRight: 0 },
  authorChunk: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.HALF_TINY,
  },
});

const areEqual = (prevProps: FilterModalProps, nextProps: FilterModalProps) => {
  if (prevProps.availableAuthors.length !== nextProps.availableAuthors.length) return false;
  return prevProps.availableAuthors.every((a, i) => a?.id === nextProps.availableAuthors[i]?.id);
};

FilterModal.displayName = 'FilterModal';

export default memo(FilterModal, areEqual);
