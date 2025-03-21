import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, FlatList, StatusBar } from 'react-native';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useColors } from '../hooks/useColors';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '../services/studyWords';
import { Loader } from '../components/Loader';
import PageHeader from '../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { StudyWord } from '../types/vocabulary.types';
import WordListItem from '../components/WordListItem';
import Animated, { FadeIn } from 'react-native-reanimated';
import CategoryInfoCard from '../components/vocabulary/CategoryInfoCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enhanced study word with mastery score
interface EnhancedStudyWord extends StudyWord {
  masteryScore: number;
}

/**
 * Calculate a mastery score for a word based on its properties
 * Score ranges from 0-100, higher is better memorized
 */
const calculateMasteryScore = (word: StudyWord): number => {
  // Consider multiple factors to determine mastery level
  const intervalScore = Math.min(word.interval_days / 30, 1) * 40; // 40% weight for interval
  const reviewScore = Math.min(word.review_count / 10, 1) * 30; // 30% weight for review count
  const easeFactor = Math.min((word.ease_factor - 1.3) / 2.7, 1) * 20; // 20% weight for ease factor
  const lapsesPenalty = Math.min(word.lapses / 5, 1) * 10; // 10% penalty for lapses

  // Combine scores (100 max, subtract lapses penalty)
  return Math.max(
    0,
    Math.min(100, Math.round(intervalScore + reviewScore + easeFactor - lapsesPenalty))
  );
};

// Helper function to calculate header height
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE;
};

export default function WordListScreen() {
  const { category } = useLocalSearchParams();
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Get the title and icon based on the category
  const { title, icon, description } = React.useMemo(() => {
    switch (category) {
      case 'total':
        return {
          title: 'Total Words',
          icon: 'book',
          description: 'Sorted by mastery level',
        };
      case 'mastered':
        return {
          title: 'Mastered Words',
          icon: 'checkmark-circle',
          description: 'Words with long intervals',
        };
      case 'learning':
        return {
          title: 'Learning Words',
          icon: 'school',
          description: 'Words with short intervals',
        };
      case 'due':
        return {
          title: 'Review Words',
          icon: 'alarm',
          description: 'Words due today',
        };
      default:
        return {
          title: 'Word List',
          icon: 'book',
          description: 'Sorted by mastery level',
        };
    }
  }, [category]);

  // Fetch words based on the category
  const { data: wordsData, isLoading } = useQuery<EnhancedStudyWord[]>({
    queryKey: ['vocabulary-words', user?.id, category],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // For all categories, fetch the complete data without using forStats
        const allWords = await studyWordsService.getStudyWords(user.id);

        // Filter out invalid words
        const filteredWords = allWords.filter(
          word => word && word.sentence_word && word.sentence_word.word_form
        );

        // Filter words based on category
        let result = [];
        switch (category) {
          case 'total':
            result = filteredWords;
            break;
          case 'mastered':
            result = filteredWords.filter(word => word.interval_days >= 21);
            break;
          case 'learning':
            result = filteredWords.filter(word => word.interval_days < 21);
            break;
          case 'due':
            // For due words, specifically use the onlyDue parameter
            const dueWords = await studyWordsService.getStudyWords(user.id, { onlyDue: true });
            result = dueWords.filter(
              word => word && word.sentence_word && word.sentence_word.word_form
            );
            break;
          default:
            result = filteredWords;
        }

        // Calculate mastery score for each word
        return result.map(word => ({
          ...word,
          masteryScore: calculateMasteryScore(word),
        })) as EnhancedStudyWord[];
      } catch (error) {
        console.error('Error fetching words:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Sort the words by mastery score (highest first)
  const sortedWords = useMemo(() => {
    if (!wordsData) return [];
    // Sort by mastery score (highest to lowest)
    return [...wordsData].sort((a, b) => b.masteryScore - a.masteryScore);
  }, [wordsData]);

  const handleWordPress = useCallback((word: EnhancedStudyWord) => {
    // Navigate to word detail or implement whatever action is needed
    console.log('Word pressed:', word);
  }, []);

  // Render an item in the list
  const renderItem = useCallback(
    ({ item }: { item: EnhancedStudyWord }) => (
      <WordListItem
        word={item}
        onPress={() => handleWordPress(item)}
        masteryScore={item.masteryScore}
      />
    ),
    [handleWordPress]
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

  // Get the word count for display
  const wordCount = useMemo(() => sortedWords?.length || 0, [sortedWords]);

  // List header component with category info card
  const ListHeaderComponent = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.headerContainer}>
        {/* Category Info Card */}
        <CategoryInfoCard
          category={category as 'total' | 'mastered' | 'learning' | 'due'}
          hideTitle={true}
        />
      </View>
    );
  }, [isLoading, category]);

  return (
    <>
      {/* Hide the native status bar */}
      <StatusBar hidden />

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
                data={sortedWords || []}
                renderItem={renderItem}
                keyExtractor={item => item.sentence_word_id.toString()}
                contentContainerStyle={[
                  styles.listContent,
                  {
                    paddingTop: getHeaderHeight(insets) + LAYOUT.SPACING.LARGE,
                  }, // Extra padding below header
                ]}
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                getItemLayout={(data, index) => ({
                  length: 70, // Adjusted height to match tighter card
                  offset:
                    70 * index +
                    (category ? 150 : 0) +
                    getHeaderHeight(insets) +
                    LAYOUT.SPACING.LARGE, // Include header height and extra padding
                  index,
                })}
              />
            )}
          </View>
          <PageHeader title={title} onBackPress={handleBackPress} />
        </ThemedView>
      </Animated.View>
    </>
  );
}

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
    gap: LAYOUT.SPACING.MEDIUM, // Increased gap for better spacing between items
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
});
