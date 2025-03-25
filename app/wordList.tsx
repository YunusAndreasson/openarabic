import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useColors } from '../hooks/useColors';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LAYOUT, getHeaderHeight } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { Loader } from '../components/Loader';
import PageHeader from '../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import WordListItem from '../components/WordListItem';
import Animated, { FadeIn } from 'react-native-reanimated';
import CategoryInfoCard from '../components/vocabulary/CategoryInfoCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWordList, EnhancedStudyWord } from '../hooks/useWordList';

const ITEM_HEIGHT = 70;
const CATEGORY_HEADER_HEIGHT = 150;

export default function WordListScreen() {
  const { category } = useLocalSearchParams();
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Get the title and icon based on the category
  const { title } = React.useMemo(() => {
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

  // Render an item in the list
  const renderItem = useCallback(
    ({ item }: { item: EnhancedStudyWord }) => (
      <WordListItem
        word={item}
        masteryScore={item.retentionScore}
        onPress={() => {}} // Empty function since we don't want any action on press
      />
    ),
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
  }, [router]);

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

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset:
        ITEM_HEIGHT * index +
        (category ? CATEGORY_HEADER_HEIGHT : 0) +
        getHeaderHeight(insets) +
        LAYOUT.SPACING.LARGE,
      index,
    }),
    [category, insets]
  );

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
          <View style={styles.contentWrapper}>
            {isLoading ? (
              <View
                style={[
                  styles.loaderContainer,
                  { paddingTop: getHeaderHeight(insets) + LAYOUT.SPACING.LARGE },
                ]}
              >
                <Loader size="large" color={colors.tint} />
              </View>
            ) : (
              <FlatList
                data={words || []}
                renderItem={renderItem}
                keyExtractor={item => item.sentence_word_id.toString()}
                contentContainerStyle={[
                  styles.listContent,
                  {
                    paddingTop: getHeaderHeight(insets) + LAYOUT.SPACING.LARGE,
                  },
                ]}
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                getItemLayout={getItemLayout}
              />
            )}
          </View>
          <PageHeader title={title} onBackPress={handleBackPress} />
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
  flexContainer: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL, // Decreased gap to match vocabulary.tsx
  },
  headerContainer: {
    paddingBottom: LAYOUT.SPACING.LARGE, // Increased padding
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.XLARGE * 2, // Increased top margin
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    marginTop: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
  },
});
