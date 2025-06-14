import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';

import BaseCard from '@/components/BaseCard';
import Pill from '@/components/Pill';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import {
  useFilterModal,
  DIFFICULTY_OPTIONS,
  DATE_RANGE_OPTIONS,
  SORT_OPTIONS,
} from '@/hooks/articles/useFilterModal';
import { useColors } from '@/hooks/theme/useColors';
import type { Author } from '@/types/articles.types';

interface FilterModalProps {
  availableAuthors: Author[];
}

const FilterModal: React.FC<FilterModalProps> = ({ availableAuthors }) => {
  const colors = useColors();
  const {
    sort,
    filters,
    activeFiltersCount,
    expandedSections,
    toggleSection,
    handleSortSelect,
    handleAuthorToggle,
    handleDifficultySelect,
    handleDateRangeSelect,
    handleClearAll,
    authorChunks,
    selectedDifficultyOption,
    selectedDateRangeOption,
    selectedAuthorsText,
  } = useFilterModal(availableAuthors);

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
                      elevation: 2, // LAYOUT.ELEVATION.SUBTLE equivalent
                      shadowOpacity: 0.15, // LAYOUT.ELEVATION.SUBTLE equivalent
                      shadowRadius: 2, // LAYOUT.ELEVATION.SUBTLE equivalent
                      shadowOffset: { width: 0, height: 1 }, // LAYOUT.ELEVATION.SUBTLE equivalent
                      shadowColor: colors.tint,
                    },
                  ]}
                  onPress={() => handleSortSelect(option.key)}
                >
                  <Ionicons
                    name={option.icon}
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

const areEqual = (prevProps: FilterModalProps, nextProps: FilterModalProps) => {
  if (prevProps.availableAuthors.length !== nextProps.availableAuthors.length) {
    return false;
  }

  for (let i = 0; i < prevProps.availableAuthors.length; i++) {
    if (prevProps.availableAuthors[i]?.id !== nextProps.availableAuthors[i]?.id) {
      return false;
    }
  }

  return true;
};

FilterModal.displayName = 'FilterModal';

export default React.memo(FilterModal, areEqual);
