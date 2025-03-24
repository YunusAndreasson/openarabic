import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useColors } from '../hooks/useColors';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LAYOUT } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  switch (word.fsrs_state) {
    case State.New:
      return {
        label: 'New',
        colorKey: 'warning' as const,
      };
    case State.Learning:
      return {
        label: 'Learning',
        colorKey: 'accent' as const,
      };
    case State.Review:
      if (word.fsrs_stability >= 30) {
        return {
          label: 'Mastered',
          colorKey: 'success' as const,
        };
      }
      return {
        label: 'Review',
        colorKey: 'info' as const,
      };
    case State.Relearning:
      return {
        label: 'Relearning',
        colorKey: 'error' as const,
      };
    default:
      return {
        label: 'Unknown',
        colorKey: 'text' as const,
      };
  }
};

// Helper function to calculate header height
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE;
};

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
  const {
    data: wordsData,
    isLoading,
    error,
  } = useQuery<EnhancedStudyWord[]>({
    queryKey: ['vocabulary-words', user?.id, category],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        // For all categories, fetch the complete data
        const allWords = await studyWordsFSRSService.getFSRSWords(user.id);

        // Filter out invalid words with type guard
        const filteredWords = allWords.filter(
          (
            word
          ): word is StudyWord & {
            sentence_word: NonNullable<typeof word.sentence_word> & {
              word_form: NonNullable<typeof word.sentence_word.word_form>;
            };
          } => {
            return Boolean(
              word &&
                word.sentence_word &&
                word.sentence_word.word_form &&
                typeof word.sentence_word.word_form === 'string'
            );
          }
        );

        // Filter words based on category using FSRS states
        let result: StudyWord[] = [];
        switch (category) {
          case 'total':
            result = filteredWords;
            break;
          case 'mastered':
            result = filteredWords.filter(
              word => word.fsrs_state === State.Review && word.fsrs_stability >= 30
            );
            break;
          case 'learning':
            result = filteredWords.filter(
              word =>
                word.fsrs_state === State.New ||
                word.fsrs_state === State.Learning ||
                word.fsrs_state === State.Relearning ||
                (word.fsrs_state === State.Review && word.fsrs_stability < 30)
            );
            break;
          case 'due':
            const dueWords = await studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true });
            result = dueWords.filter(
              (
                word
              ): word is StudyWord & {
                sentence_word: NonNullable<typeof word.sentence_word> & {
                  word_form: NonNullable<typeof word.sentence_word.word_form>;
                };
              } => {
                return Boolean(
                  word &&
                    word.sentence_word &&
                    word.sentence_word.word_form &&
                    typeof word.sentence_word.word_form === 'string'
                );
              }
            );
            break;
          default:
            result = filteredWords;
        }

        // Calculate retention score using FSRS metrics
        return result.map(word => ({
          ...word,
          retentionScore: calculateRetentionScore(word),
        }));
      } catch (error) {
        // Properly handle and rethrow the error
        console.error('Error fetching words:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch vocabulary words');
      }
    },
    enabled: !!user?.id,
    placeholderData: () => {
      const queryClient = useQueryClient();

      if (category === 'due') {
        const dueWords = queryClient.getQueryData<StudyWord[]>(['dueWords', user?.id]);
        if (!dueWords?.length) return undefined;

        const validWords = dueWords.filter(
          (
            word
          ): word is NonNullable<typeof word> & {
            sentence_word: NonNullable<StudyWord['sentence_word']> & { word_form: string };
          } =>
            Boolean(
              word?.sentence_word?.word_form && typeof word.sentence_word.word_form === 'string'
            )
        );

        return validWords.map(word => ({
          ...word,
          retentionScore: calculateRetentionScore(word),
        }));
      }

      const studyWords = queryClient.getQueryData<StudyWord[]>(['studyWords', user?.id]);
      if (!studyWords?.length) return undefined;

      const validStudyWords = studyWords.filter(
        (
          word
        ): word is NonNullable<typeof word> & {
          sentence_word: NonNullable<StudyWord['sentence_word']> & { word_form: string };
        } =>
          Boolean(
            word?.sentence_word?.word_form && typeof word.sentence_word.word_form === 'string'
          )
      );

      let filteredWords = validStudyWords;
      switch (category) {
        case 'mastered':
          filteredWords = validStudyWords.filter(
            word => word.fsrs_state === State.Review && word.fsrs_stability >= 30
          );
          break;
        case 'learning':
          filteredWords = validStudyWords.filter(
            word =>
              word.fsrs_state === State.New ||
              word.fsrs_state === State.Learning ||
              word.fsrs_state === State.Relearning ||
              (word.fsrs_state === State.Review && word.fsrs_stability < 30)
          );
          break;
      }

      return filteredWords.map(word => ({
        ...word,
        retentionScore: calculateRetentionScore(word),
      }));
    },
  });

  // Sort the words by retention score (highest first)
  const sortedWords = useMemo(() => {
    if (!wordsData) return [];
    return [...wordsData].sort((a, b) => b.retentionScore - a.retentionScore);
  }, [wordsData]);

  // Render an item in the list
  const renderItem = useCallback(
    ({ item }: { item: EnhancedStudyWord }) => (
      <WordListItem word={item} masteryScore={item.retentionScore} />
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
          category={category as 'total' | 'mastered' | 'learning' | 'due'}
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
