import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';

import BaseCard from '@/components/BaseCard';
import Pill from '@/components/Pill';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import {
  setSortField,
  toggleAuthor,
  setDifficultyRange,
  setDateRange,
  clearAllFilters,
  selectActiveFiltersCount,
} from '@/store/filtersSlice';
import type { FilterState } from '@/store/filtersSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { Author } from '@/types/articles.types';
import { selectionFeedback, lightFeedback } from '@/utils/haptics';

interface FilterModalProps {
  availableAuthors: Author[];
}

const DIFFICULTY_OPTIONS = [
  { key: 'beginner', label: 'Beginner', range: [1, 2] as [number, number] },
  { key: 'intermediate', label: 'Intermediate', range: [3, 3] as [number, number] },
  { key: 'advanced', label: 'Advanced', range: [4, 5] as [number, number] },
  { key: 'all', label: 'All difficulties', range: [1, 5] as [number, number] },
];

const DATE_RANGE_OPTIONS = [
  { key: 'week', label: 'Past week' },
  { key: 'month', label: 'Past month' },
  { key: 'all', label: 'All time' },
] as const;

const SORT_OPTIONS = [
  { key: 'title', label: 'Title', icon: 'text-outline' },
  { key: 'author', label: 'Author', icon: 'person-outline' },
  { key: 'date', label: 'Date added', icon: 'calendar-outline' },
  { key: 'difficulty', label: 'Difficulty', icon: 'trending-up-outline' },
] as const;

const FilterModal: React.FC<FilterModalProps> = ({ availableAuthors }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const { sort, filters } = useAppSelector(state => state.filters);
  const activeFiltersCount = useAppSelector(selectActiveFiltersCount);

  // Local state for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    authors: false,
    difficulty: false,
    dateRange: false,
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    selectionFeedback();
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleSortSelect = useCallback(
    (sortField: FilterState['sort']['field']) => {
      selectionFeedback();
      dispatch(setSortField(sortField));
    },
    [dispatch]
  );

  const handleAuthorToggle = useCallback(
    (authorId: number) => {
      dispatch(toggleAuthor(authorId));
    },
    [dispatch]
  );

  const handleDifficultySelect = useCallback(
    (range: [number, number]) => {
      dispatch(setDifficultyRange(range));
    },
    [dispatch]
  );

  const handleDateRangeSelect = useCallback(
    (dateRange: FilterState['filters']['dateRange']) => {
      dispatch(setDateRange(dateRange));
    },
    [dispatch]
  );

  const handleClearAll = useCallback(() => {
    lightFeedback();
    dispatch(clearAllFilters());
  }, [dispatch]);

  // Get selected difficulty option
  const selectedDifficultyOption = useMemo(() => {
    return (
      DIFFICULTY_OPTIONS.find(
        option =>
          option.range[0] === filters.difficultyRange[0] &&
          option.range[1] === filters.difficultyRange[1]
      ) || DIFFICULTY_OPTIONS[3]
    ); // default to 'all'
  }, [filters.difficultyRange]);

  // Get selected authors count and display text
  const selectedAuthorsCount = filters.authorIds.length;
  const selectedAuthorsText = useMemo(() => {
    if (selectedAuthorsCount === 0) {
      return 'All authors';
    }
    if (selectedAuthorsCount === 1) {
      const selectedAuthor = availableAuthors.find(a => a.id === filters.authorIds[0]);
      return selectedAuthor?.name || 'Author';
    }
    return `${selectedAuthorsCount} selected`;
  }, [selectedAuthorsCount, availableAuthors, filters.authorIds]);

  // Group authors into chunks for better UX (Miller's Law - 7±2 items)
  const authorChunks = useMemo(() => {
    const chunkSize = 6; // Keep under 7 items per visual group
    const chunks = [];
    for (let i = 0; i < availableAuthors.length; i += chunkSize) {
      chunks.push(availableAuthors.slice(i, i + chunkSize));
    }
    return chunks;
  }, [availableAuthors]);

  const selectedDateRangeOption = DATE_RANGE_OPTIONS.find(
    option => option.key === filters.dateRange
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
        {/* Sort Section */}
        <BaseCard shadowSize="small" style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold">
              Sort by
            </ThemedText>
          </View>

          <View style={styles.sortGrid}>
            {SORT_OPTIONS.map(option => {
              const isSelected = sort.field === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    styles.sortOption,
                    isSelected && {
                      backgroundColor: colors.elevation1,
                      borderColor: colors.tint + '40',
                      ...LAYOUT.SHADOW.SUBTLE,
                      shadowColor: colors.tint,
                    },
                  ]}
                  onPress={() => handleSortSelect(option.key)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={isSelected ? colors.tint : colors.secondaryText}
                  />
                  <ThemedText
                    type="label"
                    weight={isSelected ? 'bold' : 'medium'}
                    colorName={isSelected ? 'tint' : 'secondaryText'}
                  >
                    {option.label}
                  </ThemedText>
                  {isSelected && (
                    <ThemedText
                      type="caption"
                      weight="semibold"
                      colorName="tint"
                      style={styles.sortDirection}
                    >
                      {sort.direction === 'desc' ? '↓' : '↑'}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </BaseCard>

        {/* Filter Sections */}
        <BaseCard shadowSize="small" style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold">
              Filters
            </ThemedText>
            {activeFiltersCount > 0 && (
              <Pressable onPress={handleClearAll} style={styles.clearButton}>
                <ThemedText type="label" colorName="tint" weight="medium">
                  Reset filters
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Authors Filter */}
          <Pressable
            style={[styles.filterRow, { borderBottomColor: colors.borderOverlay }]}
            onPress={() => toggleSection('authors')}
          >
            <View style={styles.filterRowLeft}>
              <Ionicons name="person-outline" size={20} color={colors.secondaryText} />
              <ThemedText type="body" weight="medium">
                Authors
              </ThemedText>
            </View>
            <View style={styles.filterRowRight}>
              <ThemedText type="label" colorName="secondaryText">
                {selectedAuthorsText}
              </ThemedText>
              <Ionicons
                name={expandedSections.authors ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.secondaryText}
              />
            </View>
          </Pressable>

          {expandedSections.authors && (
            <View style={styles.expandedContent}>
              <View style={styles.pillGrid}>
                {authorChunks.map(chunk => (
                  <View key={chunk[0]?.id || chunk.length} style={styles.authorChunk}>
                    {chunk.map(author => (
                      <Pill
                        key={author.id}
                        id={author.id}
                        label={author.name}
                        isSelected={filters.authorIds.includes(author.id)}
                        onSelect={() => handleAuthorToggle(author.id)}
                        variant="filter"
                        pillStyle={styles.filterPill}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Difficulty Filter */}
          <Pressable
            style={[styles.filterRow, { borderBottomColor: colors.borderOverlay }]}
            onPress={() => toggleSection('difficulty')}
          >
            <View style={styles.filterRowLeft}>
              <Ionicons name="trending-up-outline" size={20} color={colors.secondaryText} />
              <ThemedText type="body" weight="medium">
                Difficulty
              </ThemedText>
            </View>
            <View style={styles.filterRowRight}>
              <ThemedText type="label" colorName="secondaryText">
                {selectedDifficultyOption?.label}
              </ThemedText>
              <Ionicons
                name={expandedSections.difficulty ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.secondaryText}
              />
            </View>
          </Pressable>

          {expandedSections.difficulty && (
            <View style={styles.expandedContent}>
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
                    onSelect={() => handleDifficultySelect(option.range)}
                    variant="filter"
                    pillStyle={styles.filterPill}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Date Range Filter */}
          <Pressable
            style={[styles.filterRow, styles.lastFilterRow]}
            onPress={() => toggleSection('dateRange')}
          >
            <View style={styles.filterRowLeft}>
              <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} />
              <ThemedText type="body" weight="medium">
                Date range
              </ThemedText>
            </View>
            <View style={styles.filterRowRight}>
              <ThemedText type="label" colorName="secondaryText">
                {selectedDateRangeOption?.label}
              </ThemedText>
              <Ionicons
                name={expandedSections.dateRange ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.secondaryText}
              />
            </View>
          </Pressable>

          {expandedSections.dateRange && (
            <View style={styles.expandedContent}>
              <View style={styles.pillGrid}>
                {DATE_RANGE_OPTIONS.map(option => (
                  <Pill
                    key={option.key}
                    id={option.key}
                    label={option.label}
                    isSelected={filters.dateRange === option.key}
                    onSelect={() => handleDateRangeSelect(option.key)}
                    variant="filter"
                    pillStyle={styles.filterPill}
                  />
                ))}
              </View>
            </View>
          )}
        </BaseCard>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  card: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  clearButton: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    minHeight: 48,
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: '47%',
    minHeight: 48,
  },
  sortDirection: {
    marginLeft: 'auto',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  lastFilterRow: {
    borderBottomWidth: 0,
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    flex: 1,
  },
  filterRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  expandedContent: {
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
  },
  filterPill: {
    marginBottom: 0,
    marginRight: 0,
  },
  authorChunk: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
  },
});

export default FilterModal;
