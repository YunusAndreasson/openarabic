import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useCallback, useMemo, memo, JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { Loader } from '../components/Loader';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import CategoryInfoCard from '../components/vocabulary/CategoryInfoCard';
import WordListItem from '../components/vocabulary/WordListItem';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import type { EnhancedStudyWord } from '../hooks/useWordList';
import { useWordList } from '../hooks/useWordList';

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
          title: 'Word List',
          icon: 'book',
          description: 'All vocabulary words',
        };
    }
  }, [category]);

  // Use the new hook to fetch and process words
  const {
    data: words,
    isLoading,
    error,
  } = useWordList(user?.id, category as 'total' | 'mastered' | 'learning');

  // Optimize renderItem for FlashList
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { readonly item: EnhancedStudyWord }) => <WordListItemMemo item={item} />,
    []
  );

  // Empty list component
  const renderEmptyComponent = useCallback(() => {
    if (isLoading) return null;

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
  }, [isLoading, colors.tint]);

  // List header component with category info card
  const ListHeaderComponent = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.headerContainer}>
        {/* Category Info Card */}
        <CategoryInfoCard
          category={category as 'total' | 'mastered' | 'learning'}
          hideTitle={true}
        />
      </View>
    );
  }, [isLoading, category]);

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
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <Loader size="large" color={colors.tint} />
          </View>
        ) : (
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
        )}
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
  loaderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  wordItemContainer: {
    marginVertical: LAYOUT.SPACING.TINY / 4,
  },
});
