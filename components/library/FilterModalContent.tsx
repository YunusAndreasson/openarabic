import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, type FC } from 'react';
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
import { UiAction } from '@/types/enums';

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
    handleAuthorsAllSelect,
    handleDifficultySelect,
    handleDateRangeSelect,
    handleClearAll,
    selectedDifficultyOption,
    selectedDateRangeOption,
    selectedAuthorsText,
  } = useFilterModal(availableAuthors);

  const [optimisticExpandedSections, setOptimisticExpandedSections] =
    React.useState(expandedSections);

  // Sync optimistic state with actual state when it changes
  React.useEffect(() => {
    setOptimisticExpandedSections(expandedSections);
  }, [expandedSections]);

  // Minimal summary handled by section subtitles; show only count and reset at top

  const handleToggleAuthors = useCallback(() => {
    // Optimistic update - immediately show the new state
    setOptimisticExpandedSections(prev => ({ ...prev, authors: !prev.authors }));
    toggleSection('authors');
  }, [toggleSection]);

  const handleToggleDifficulty = useCallback(() => {
    // Optimistic update - immediately show the new state
    setOptimisticExpandedSections(prev => ({ ...prev, difficulty: !prev.difficulty }));
    toggleSection('difficulty');
  }, [toggleSection]);

  const handleToggleDateRange = useCallback(() => {
    // Optimistic update - immediately show the new state
    setOptimisticExpandedSections(prev => ({ ...prev, dateRange: !prev.dateRange }));
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
        showsVerticalScrollIndicator={true}
      >
        <BaseCard shadowSize="small" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View
              style={[
                styles.summaryBadge,
                {
                  backgroundColor: activeFiltersCount === 0 ? colors.disabled : colors.tint,
                },
              ]}
              accessible={true}
              accessibilityLabel={`${UiAction.FILTERS}: ${activeFiltersCount}`}
            >
              <ThemedText
                type="body"
                weight="bold"
                colorName={activeFiltersCount === 0 ? 'secondaryText' : 'background'}
              >
                {activeFiltersCount}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleClearAll}
              disabled={activeFiltersCount === 0}
              style={[
                styles.clearAllButton,
                {
                  borderWidth: 1,
                  borderColor: activeFiltersCount === 0 ? colors.border : colors.warning,
                  backgroundColor: 'transparent',
                },
                activeFiltersCount === 0 && styles.clearAllButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: activeFiltersCount === 0 }}
              accessibilityLabel={UiAction.RESET_FILTERS}
            >
              <ThemedText
                type="label"
                colorName={activeFiltersCount === 0 ? 'secondaryText' : 'warning'}
                weight="semibold"
              >
                {UiAction.RESET_FILTERS}
              </ThemedText>
            </Pressable>
          </View>
          {/* Intentionally empty: sections below display current selections */}
        </BaseCard>

        <BaseCard shadowSize="small" style={styles.card}>
          <View style={styles.filterSection}>
            <Pressable
              style={[
                styles.filterRow,
                optimisticExpandedSections.authors && [
                  styles.filterRowExpanded,
                  { backgroundColor: colors.elevation2 },
                ],
                { borderBottomColor: colors.borderOverlay },
              ]}
              onPress={handleToggleAuthors}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.AUTHORS}
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
                    <ThemedText
                      type="caption"
                      colorName="secondaryText"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedAuthorsText}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.expandIndicator}>
                  <Ionicons
                    name={optimisticExpandedSections.authors ? 'chevron-up' : 'chevron-down'}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    color={optimisticExpandedSections.authors ? colors.tint : colors.secondaryText}
                  />
                </View>
              </View>
            </Pressable>

            {optimisticExpandedSections.authors && (
              <View
                style={[
                  styles.expandedContent,
                  styles.expandedContentIndented,
                  { backgroundColor: colors.elevation2 },
                ]}
              >
                <View style={styles.pillGrid}>
                  <Pill
                    id={-1}
                    label={STRINGS.ALL_AUTHORS}
                    isSelected={filters.authorIds.length === 0}
                    onSelect={handleAuthorsAllSelect}
                    variant="filter"
                  />
                  {availableAuthors.map(author => (
                    <Pill
                      key={author.id}
                      id={author.id}
                      label={author.name}
                      isSelected={filters.authorIds.includes(author.id)}
                      onSelect={selectAuthor(author.id)}
                      variant="filter"
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
                optimisticExpandedSections.difficulty && [
                  styles.filterRowExpanded,
                  { backgroundColor: colors.elevation2 },
                ],
                { borderBottomColor: colors.borderOverlay },
              ]}
              onPress={handleToggleDifficulty}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.DIFFICULTY}
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
                    <ThemedText
                      type="caption"
                      colorName="secondaryText"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedDifficultyOption?.label}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.expandIndicator}>
                  <Ionicons
                    name={optimisticExpandedSections.difficulty ? 'chevron-up' : 'chevron-down'}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    color={
                      optimisticExpandedSections.difficulty ? colors.tint : colors.secondaryText
                    }
                  />
                </View>
              </View>
            </Pressable>

            {optimisticExpandedSections.difficulty && (
              <View
                style={[
                  styles.expandedContent,
                  styles.expandedContentIndented,
                  { backgroundColor: colors.elevation2 },
                ]}
              >
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
                optimisticExpandedSections.dateRange && [
                  styles.filterRowExpanded,
                  { backgroundColor: colors.elevation2 },
                ],
              ]}
              onPress={handleToggleDateRange}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.DATE_RANGE}
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
                    <ThemedText
                      type="caption"
                      colorName="secondaryText"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedDateRangeOption?.label}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.expandIndicator}>
                  <Ionicons
                    name={optimisticExpandedSections.dateRange ? 'chevron-up' : 'chevron-down'}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    color={
                      optimisticExpandedSections.dateRange ? colors.tint : colors.secondaryText
                    }
                  />
                </View>
              </View>
            </Pressable>

            {optimisticExpandedSections.dateRange && (
              <View
                style={[
                  styles.expandedContent,
                  styles.expandedContentIndented,
                  { backgroundColor: colors.elevation2 },
                ]}
              >
                <View style={styles.pillGrid}>
                  {DATE_RANGE_OPTIONS.map(option => (
                    <Pill
                      key={option.key}
                      id={option.key}
                      label={option.label}
                      isSelected={filters.dateRange === option.key}
                      onSelect={selectDateRange(option.key)}
                      variant="filter"
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    paddingLeft: LAYOUT.SPACING.MEDIUM,
  },
  // summaryLine: { marginTop: LAYOUT.SPACING.SMALL },
  summaryBadge: {
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
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
    alignItems: 'center',
  },
  clearAllButtonDisabled: {
    opacity: 0.5,
  },
  card: { marginBottom: LAYOUT.SPACING.MEDIUM, padding: LAYOUT.SPACING.MEDIUM },
  filterSection: { marginBottom: LAYOUT.SPACING.SMALL },
  // sectionAlign: {},
  filterRow: {
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
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
  expandedContentIndented: {
    // Indent inner content to visually align pills with section text (after icon)
    paddingLeft: MIN_TOUCH_TARGET.MEDIUM + LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.MEDIUM,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
  },
  // authorList: {},
  // filterPillFullWidth: {},
  // authorChunk: {},
});

const areEqual = (prevProps: FilterModalProps, nextProps: FilterModalProps) => {
  if (prevProps.availableAuthors.length !== nextProps.availableAuthors.length) return false;
  return prevProps.availableAuthors.every((a, i) => a?.id === nextProps.availableAuthors[i]?.id);
};

FilterModal.displayName = 'FilterModal';

export default memo(FilterModal, areEqual);
