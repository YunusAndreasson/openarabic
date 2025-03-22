import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useColors } from '../hooks/useColors';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { Loader } from '../components/Loader';
import PageHeader from '../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { StudyWord } from '../types/vocabulary.types';
import WordListItem from '../components/WordListItem';
import Animated, { FadeIn } from 'react-native-reanimated';
import CategoryInfoCard from '../components/vocabulary/CategoryInfoCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { State } from 'ts-fsrs'; // Import State enum from ts-fsrs

// Enhanced study word with retention score
interface EnhancedStudyWord extends StudyWord {
  retentionScore: number;
}

/**
 * Calculate a retention score based on FSRS parameters
 * This directly uses the key metrics from FSRS algorithm
 */
const calculateRetentionScore = (word: StudyWord): number => {
  // Use FSRS stability directly - this is the core metric FSRS uses to determine memory strength
  // Higher stability = better retention
  const stabilityScore = Math.min(word.fsrs_stability / 100, 1) * 60;

  // Use FSRS difficulty (inversely) - this is the FSRS-calculated difficulty factor (lower is easier)
  const difficultyFactor = 1 - word.fsrs_difficulty;
  const difficultyScore = difficultyFactor * 30;

  // Apply a penalty based on lapses in FSRS
  const lapsesPenalty = Math.min(word.fsrs_lapses / 10, 1) * 20;

  // Return a weighted score based on FSRS parameters
  return Math.max(0, Math.min(100, Math.round(stabilityScore + difficultyScore - lapsesPenalty)));
};

/**
 * Get label and color based on FSRS State enum
 * This directly uses the State enum from ts-fsrs
 */
const getStateInfo = (word: StudyWord) => {
  // Use FSRS state enum directly
  switch (word.fsrs_state) {
    case State.New:
      return {
        label: 'New',
        color: '#ff9500', // Orange
      };
    case State.Learning:
      return {
        label: 'Learning',
        color: '#ffcc00', // Yellow
      };
    case State.Review:
      // For Review state, further differentiate based on stability
      if (word.fsrs_stability >= 30) {
        return {
          label: 'Mastered',
          color: '#34c759', // Green
        };
      }
      return {
        label: 'Review',
        color: '#5ac8fa', // Blue
      };
    case State.Relearning:
      return {
        label: 'Relearning',
        color: '#ff3b30', // Red
      };
    default:
      return {
        label: 'Unknown',
        color: '#8e8e93', // Gray
      };
  }
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
          description: 'All vocabulary words',
        };
    }
  }, [category]);

  // Fetch words based on the category
  const { data: wordsData, isLoading } = useQuery<EnhancedStudyWord[]>({
    queryKey: ['vocabulary-words', user?.id, category],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // For all categories, fetch the complete data
        const allWords = await studyWordsFSRSService.getFSRSWords(user.id);

        // Filter out invalid words
        const filteredWords = allWords.filter(
          word => word && word.sentence_word && word.sentence_word.word_form
        );

        // Filter words based on category using FSRS states
        let result = [];
        switch (category) {
          case 'total':
            result = filteredWords;
            break;
          case 'mastered':
            // Use FSRS State.Review and high stability (proper FSRS measure of mastery)
            result = filteredWords.filter(
              word => word.fsrs_state === State.Review && word.fsrs_stability >= 30
            );
            break;
          case 'learning':
            // Include New, Learning, and Relearning states from FSRS
            result = filteredWords.filter(
              word =>
                word.fsrs_state === State.New ||
                word.fsrs_state === State.Learning ||
                word.fsrs_state === State.Relearning ||
                (word.fsrs_state === State.Review && word.fsrs_stability < 30)
            );
            break;
          case 'due':
            // For due words, use the onlyDue parameter (relies on fsrs_due)
            const dueWords = await studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true });
            result = dueWords.filter(
              word => word && word.sentence_word && word.sentence_word.word_form
            );
            break;
          default:
            result = filteredWords;
        }

        // Calculate retention score using FSRS metrics
        return result.map(word => ({
          ...word,
          retentionScore: calculateRetentionScore(word),
        })) as EnhancedStudyWord[];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Sort the words by retention score (highest first)
  const sortedWords = useMemo(() => {
    if (!wordsData) return [];
    // Sort by retention score (highest to lowest)
    return [...wordsData].sort((a, b) => b.retentionScore - a.retentionScore);
  }, [wordsData]);

  const handleWordPress = useCallback((word: EnhancedStudyWord) => {
    // Navigate to word detail or implement whatever action is needed
  }, []);

  // Render an item in the list
  const renderItem = useCallback(
    ({ item }: { item: EnhancedStudyWord }) => (
      <WordListItem
        word={item}
        onPress={() => handleWordPress(item)}
        masteryScore={item.retentionScore}
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
