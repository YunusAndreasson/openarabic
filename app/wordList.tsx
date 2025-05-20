import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useCallback, useMemo, memo, JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import WordListItem from '../components/vocabulary/WordListItem';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import type { EnhancedStudyWord, WordListSort } from '../hooks/useWordList';
import { useWordList } from '../hooks/useWordList';
import Pill from '../components/Pill';
import InfoCard from '../components/InfoCard';
import BaseCard from '../components/BaseCard';
import { router } from 'expo-router';

const ITEM_HEIGHT = LAYOUT.SPACING.XLARGE * 3;

// Move WordListItem component definition outside to optimize recycling
interface WordListItemMemoProps {
  readonly item: EnhancedStudyWord;
}

const WordListItemMemo = memo(({ item }: WordListItemMemoProps) => {
  // Handler for navigating to examples screen
  const handleShowExamples = useCallback(() => {
    if (!item.root_id) return;

    // Pass word meaning and letters directly to avoid unnecessary loading
    router.push({
      pathname: '/wordExamples',
      params: {
        rootId: item.root_id.toString(),
        rootMeaning: item.root?.meaning || '',
        rootLetters: item.root?.letters || '',
      },
    });
  }, [item.root_id, item.root?.meaning, item.root?.letters]);

  return (
    <View style={styles.wordItemContainer}>
      <BaseCard
        shadowSize="small"
        style={{ marginBottom: LAYOUT.SPACING.TINY }}
        onPress={handleShowExamples}
      >
        <WordListItem word={item} />
      </BaseCard>
    </View>
  );
});

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
          title: 'Mastered',
          icon: 'checkmark-circle',
          description: 'Words with high stability',
        };
      case 'learning':
        return {
          title: 'Learning',
          icon: 'school',
          description: 'Words still being learned',
        };
      default:
        return {
          title: 'Review',
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
        <ThemedText variant="secondary" style={styles.emptyText}>
          No words found
        </ThemedText>
      </View>
    );
  }, [colors.tint]);

  // List header component with sort control only
  const ListHeaderComponent = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        {/* Sort Control Card */}
        <InfoCard
          hideTitle
          iconBgColor={getSortCardBgColor()}
          shadowSize="small"
          style={{
            marginBottom: LAYOUT.SPACING.SMALL,
            marginHorizontal: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
              paddingVertical: LAYOUT.SPACING.TINY,
              paddingHorizontal: LAYOUT.SPACING.TINY,
            }}
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
                  pillBg={isSelected ? undefined : colors.transparent}
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
                        color={isSelected ? colors.icon : colors.transparent}
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
  }, [sortBy, getSortCardBgColor, sortDirection]);

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
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 2,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTransparent: false,
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
          estimatedFirstItemOffset={LAYOUT.SPACING.XLARGE}
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
    paddingTop: 0,
  },
  listContentContainer: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  wordItemContainer: {
    marginVertical: 0,
  },
  headerButton: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
  },
});
