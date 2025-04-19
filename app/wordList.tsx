import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import React, { useCallback, useMemo, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loader } from '../components/Loader';
import PageHeader from '../components/PageHeader';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import CategoryInfoCard from '../components/vocabulary/CategoryInfoCard';
import WordListItem from '../components/vocabulary/WordListItem';
import { LAYOUT, getHeaderHeight } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import type { EnhancedStudyWord } from '../hooks/useWordList';
import { useWordList } from '../hooks/useWordList';

const ITEM_HEIGHT = 60;

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
  const insets = useSafeAreaInsets();

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
        <Ionicons name="information-circle-outline" size={60} color={colors.tint} />
        <ThemedText style={styles.emptyText}>No words found</ThemedText>
      </View>
    );
  }, [isLoading, colors.tint]);

  // Handle back button press
  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

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
          <ThemedText style={[styles.errorText, { color: colors.error }]}>
            Failed to load vocabulary words. Please try again later.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      {/* Disable the native header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Use Animated.View with explicit FadeIn animation for smoother entrance */}
      <Animated.View
        style={styles.flexContainer}
        entering={FadeIn.duration(300).springify().damping(14).stiffness(100)}
      >
        <ThemedView
          style={styles.container}
          includeBottomInset={false}
          safeAreaEdges={['left', 'right']}
        >
          <PageHeader title={title} onBackPress={handleBackPress} />
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
              estimatedFirstItemOffset={getHeaderHeight(insets) + LAYOUT.SPACING.MEDIUM}
              overrideItemLayout={layout => {
                layout.size = ITEM_HEIGHT;
              }}
              drawDistance={100}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{
                paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
                paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT,
                paddingTop: LAYOUT.SPACING.XXLARGE * 3,
              }}
            />
          )}
        </ThemedView>
      </Animated.View>
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
    fontSize: 16,
    textAlign: 'center',
  },
  flexContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 0,
  },
  loaderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  wordItemContainer: {
    marginVertical: 1,
  },
});
