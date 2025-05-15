import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import React, { useCallback, useMemo, memo, JSX } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import CategoryInfoCard from '../components/vocabulary/CategoryInfoCard';
import WordListItem from '../components/vocabulary/WordListItem';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import type { EnhancedStudyWord, WordListSort } from '../hooks/useWordList';
import { useWordList } from '../hooks/useWordList';
import Pill from '../components/Pill';
import InfoCard from '../components/InfoCard';
import { lightFeedback } from '@/utils/haptics';

const ITEM_HEIGHT = LAYOUT.SPACING.XLARGE * 3;

// Move WordListItem component definition outside to optimize recycling
interface WordListItemMemoProps {
  readonly item: EnhancedStudyWord;
}

const WordListItemMemo = memo(({ item }: WordListItemMemoProps) => (
  <View style={styles.wordItemContainer}>
    <WordListItem word={item} />
  </View>
));

WordListItemMemo.displayName = 'WordListItemMemo';

export default function WordListScreen(): JSX.Element {
  const { category } = useLocalSearchParams();
  const colors = useColors();
  const { user } = useAuth();

  // Add sort state
  const [sortBy, setSortBy] = React.useState<WordListSort>('retention');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  // Compute sort card background color to match info card
  const getSortCardBgColor = useCallback(() => {
    return colors.card;
  }, [colors.card]);

  // Get the title and icon based on the category
  const { title } = useMemo(() => {
    switch (category) {
      case 'total':
        return {
          title: 'Total Words',
          icon: 'book',
          description: 'Sorted by retention strength',
        };
      case 'mastered':
        return {
          title: 'Mastered Words',
          icon: 'checkmark-circle',
          description: 'Words with high stability',
        };
      case 'learning':
        return {
          title: 'Learning Words',
          icon: 'school',
          description: 'Words still being learned',
        };
      default:
        return {
          title: 'Review Words',
          icon: 'book',
          description: 'Words to review',
        };
    }
  }, [category]);

  // Use the new hook to fetch and process words
  const { data: words, error } = useWordList(
    user?.id,
    category as 'total' | 'mastered' | 'learning' | 'due',
    sortBy,
    sortDirection
  );

  // Handler for viewing examples
  const handleViewExamples = useCallback(() => {
    lightFeedback();
    router.push({
      pathname: '/wordExamples',
      params: { category: category as string },
    });
  }, [category]);

  // Optimize renderItem for FlashList
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { readonly item: EnhancedStudyWord }) => <WordListItemMemo item={item} />,
    []
  );

  // Empty list component
  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="information-circle-outline"
          size={LAYOUT.SPACING.XLARGE * 3}
          color={colors.tint}
        />
        <ThemedText style={styles.emptyText}>No words found</ThemedText>
      </View>
    );
  }, [colors.tint]);

  // List header component with category info card and sort control
  const ListHeaderComponent = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        {/* Category Info Card */}
        <View style={{ marginBottom: LAYOUT.SPACING.TINY }}>
          <CategoryInfoCard
            category={category as 'total' | 'mastered' | 'learning'}
            hideTitle={true}
          />
        </View>
        {/* Sort Control Card (now using InfoCard for perfect match) */}
        <InfoCard
          hideTitle
          iconBgColor={getSortCardBgColor()}
          shadowSize="small"
          style={{ marginBottom: LAYOUT.SPACING.MEDIUM }}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}
          >
            {[
              { label: 'Memory Strength', value: 'retention' },
              { label: 'A-Z', value: 'alphabetical' },
              { label: 'Streak', value: 'streak' },
            ].map(option => {
              const isSelected = sortBy === option.value;
              return (
                <Pill
                  key={option.value + '-' + sortDirection}
                  id={option.value}
                  isSelected={isSelected}
                  onSelect={() => {
                    if (isSelected) {
                      setSortDirection(d => (d === 'desc' ? 'asc' : 'desc'));
                    } else {
                      setSortBy(option.value as WordListSort);
                      setSortDirection('desc');
                    }
                  }}
                  variant="filter"
                  pillBg={isSelected ? undefined : 'transparent'}
                  pillStyle={{
                    marginHorizontal: 4,
                    marginBottom: 0,
                    marginRight: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  label={
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ThemedText
                        type="label"
                        colorName={isSelected ? 'tint' : 'text'}
                        style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
                      >
                        {option.label}
                      </ThemedText>
                      <Ionicons
                        name={
                          isSelected
                            ? sortDirection === 'desc'
                              ? 'chevron-down'
                              : 'chevron-up'
                            : 'chevron-down'
                        }
                        size={16}
                        style={{ marginLeft: 4, marginTop: 1 }}
                        color={isSelected ? '#888' : 'transparent'}
                      />
                    </View>
                  }
                />
              );
            })}
          </View>
        </InfoCard>
      </View>
    );
  }, [category, sortBy, getSortCardBgColor, sortDirection]);

  // Add error UI handling
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title }} />
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Failed to load vocabulary words. Please try again later.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      {/* Disable the native header */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: title,
          headerTitleStyle: {
            fontSize: 22,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTransparent: true,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Vocabulary',
        }}
      />

      {/* Use Animated.View with explicit FadeIn animation for smoother entrance */}
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <FlashList
          data={words || []}
          renderItem={renderItem}
          estimatedItemSize={ITEM_HEIGHT}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={true}
          estimatedFirstItemOffset={LAYOUT.SPACING.XXLARGE * 3}
          overrideItemLayout={layout => {
            layout.size = ITEM_HEIGHT;
          }}
          drawDistance={100}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContentContainer}
        />
      </ThemedView>
    </>
  );
}

WordListScreen.displayName = 'WordListScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  errorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  },
  headerContainer: {
    paddingBottom: 0,
  },
  listContentContainer: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  wordItemContainer: {
    marginVertical: LAYOUT.SPACING.TINY / 4,
  },
  headerButton: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
  },
});
