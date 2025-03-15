import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, FlatList, StatusBar } from 'react-native';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useColors } from '../hooks/useColors';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '../services/study_words';
import { Loader } from '../components/Loader';
import PageHeader from '../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { StudyWord } from '../types/vocabulary.types';
import WordListItem from '../components/WordListItem';
import EntranceAnimation from '../components/EntranceAnimation';

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

export default function WordListScreen() {
  const { category } = useLocalSearchParams();
  const colors = useColors();
  const { user } = useAuth();

  // Get the title and icon based on the category
  const { title, icon, description } = React.useMemo(() => {
    switch (category) {
      case 'total':
        return {
          title: 'All Words',
          icon: 'book',
          description: 'Sorted by mastery level (best known first)',
        };
      case 'mastered':
        return {
          title: 'Mastered Words',
          icon: 'checkmark-circle',
          description: 'Words you know well (21+ days interval)',
        };
      case 'learning':
        return {
          title: 'Learning Words',
          icon: 'school',
          description: "Words you're still practicing (< 21 days)",
        };
      case 'due':
        return {
          title: 'Due for Review',
          icon: 'alarm',
          description: 'Words to practice today (sorted by mastery)',
        };
      default:
        return {
          title: 'Words',
          icon: 'book',
          description: 'Vocabulary sorted by mastery level',
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
        <ThemedText style={styles.emptyText}>No words in this category.</ThemedText>
      </View>
    );
  }, [isLoading, colors.tint]);

  // Handle back button press
  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  // Get the word count for display
  const wordCount = useMemo(() => sortedWords?.length || 0, [sortedWords]);

  return (
    <>
      {/* Hide the native status bar */}
      <StatusBar hidden />

      {/* Disable the native header */}
      <Stack.Screen options={{ headerShown: false }} />

      <ThemedView style={styles.container} useSafeArea={true}>
        {/* Page header with title and back button */}
        <PageHeader title={title} onBackPress={handleBackPress} />

        {/* Category description */}
        {!isLoading && (
          <View style={styles.headerContainer}>
            {/* Description with info */}
            <View style={styles.infoContainer}>
              <View style={styles.descriptionContainer}>
                <Ionicons
                  name={icon as any}
                  size={16}
                  color={colors.tint}
                  style={styles.headerIcon}
                />
                <ThemedText style={styles.descriptionText}>{description}</ThemedText>
              </View>

              {wordCount > 0 && (
                <ThemedText style={styles.countText}>
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </ThemedText>
              )}
            </View>

            {/* Color legend container */}
            {wordCount > 0 && (
              <View style={styles.legendContainer}>
                <View style={styles.legendBar}>
                  <View style={[styles.legendSegment, { backgroundColor: colors.error }]} />
                  <View style={[styles.legendSegment, { backgroundColor: '#f7941d' }]} />
                  <View style={[styles.legendSegment, { backgroundColor: '#ebb434' }]} />
                  <View style={[styles.legendSegment, { backgroundColor: '#63a744' }]} />
                  <View style={[styles.legendSegment, { backgroundColor: colors.success }]} />
                </View>
                <View style={styles.legendLabels}>
                  <ThemedText style={styles.legendText}>New</ThemedText>
                  <ThemedText style={styles.legendText}>Mastered</ThemedText>
                </View>
              </View>
            )}
          </View>
        )}

        <EntranceAnimation>
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <Loader size="large" color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={sortedWords || []}
              renderItem={renderItem}
              keyExtractor={item => item.sentence_word_id.toString()}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyComponent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => ({
                length: 80, // Approximate height of each item
                offset: 80 * index,
                index,
              })}
            />
          )}
        </EntranceAnimation>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  infoContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  headerIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  descriptionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  countText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  legendContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  legendBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  legendSegment: {
    flex: 1,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    gap: LAYOUT.SPACING.SMALL,
  },
  emptyContainer: {
    padding: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DISABLED,
    marginTop: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
});
