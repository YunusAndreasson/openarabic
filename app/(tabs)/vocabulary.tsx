import React, { useMemo, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/VocabularyGraph';
import { VocabularyDashboard } from '@/components/VocabularyDashboard';
import { ThemedButton } from '@/components/ThemedButton';
import { VocabularyEmptyState } from '@/components/VocabularyEmptyState';
import { SignInRequired } from '@/components/SignInRequired';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router, useNavigation } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen, LoadingContainer } from '@/components/Loader';
import { StudyWord } from '@/utils/vocabulary';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { FadeIn } from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabulary-stats';

// Create a memoized component for the review button
const ReviewButton = React.memo(
  ({ dueWords, onPress }: { dueWords: number; onPress: () => void }) => (
    <View style={styles.reviewButtonContainer}>
      <ThemedButton
        title={`Review ${dueWords} ${dueWords === 1 ? 'word' : 'words'}`}
        icon="play-circle"
        onPress={onPress}
        variant="filled"
        style={styles.reviewButton}
      />
    </View>
  )
);

ReviewButton.displayName = 'ReviewButton';

// Create a disabled review button for when there are no words to review
const DisabledReviewButton = React.memo(() => (
  <View style={styles.reviewButtonContainer}>
    <ThemedButton
      title="No words to review"
      icon="checkmark-circle"
      disabled={true}
      variant="outlined"
      style={styles.reviewButton}
    />
  </View>
));

DisabledReviewButton.displayName = 'DisabledReviewButton';

// Helper function to estimate the last review date for a word
const estimateLastReviewDate = (word: StudyWord, currentTime: Date): Date | null => {
  if (word.review_count === 0) return null;

  // The next review date is scheduled as last review date + interval days
  const reviewDate = new Date(word.next_review_at);

  // If the word has been reviewed, subtract interval days to get the approximate last review date
  reviewDate.setDate(reviewDate.getDate() - word.interval_days);

  // Ensure we don't return future dates for last review
  if (reviewDate > currentTime) return new Date(currentTime);

  return reviewDate;
};

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const loadingStartTime = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const [forceUpdate, setForceUpdate] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: studyWords = [],
    isLoading: isDataLoading,
    isFetching,
    status,
    error,
    refetch,
  } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { forStats: false }),
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Add a separate query just for due words count
  const { data: dueWordsData = [] } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { onlyDue: true }),
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for due words
    gcTime: 60000, // 1 minute
  });

  // Refetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we have a user and this isn't the initial focus
      if (user && !isInitialMount.current) {
        // Always refetch dueWords to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });

        // Check if studyWords data is stale before refetching
        const studyWordsQueryData = queryClient.getQueryState(['studyWords', user?.id]);

        const isStudyWordsStale = studyWordsQueryData?.dataUpdatedAt
          ? Date.now() - studyWordsQueryData.dataUpdatedAt > 60000 // 1 minute
          : true;

        // Only refetch studyWords if data is stale
        if (isStudyWordsStale) {
          queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
        }
      }

      // Mark initial mount as completed after first render
      if (isInitialMount.current && user) {
        isInitialMount.current = false;
      }

      return () => {
        // Clean up any pending timeouts
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = undefined;
        }
        loadingStartTime.current = null;
      };
    }, [user, queryClient])
  );

  // Create a memoized error message component
  const ErrorMessage = React.memo(() => (
    <View style={[styles.messageContainer, { marginTop: LAYOUT.SPACING.XLARGE }]}>
      <ThemedText style={[styles.message, { color: '#FF3B30' }]}>
        Error loading your vocabulary data. Please try again later.
      </ThemedText>
      <ThemedButton
        title="Retry"
        onPress={() => navigation.navigate('vocabulary')}
        style={{ marginTop: LAYOUT.SPACING.LARGE }}
      />
    </View>
  ));
  ErrorMessage.displayName = 'ErrorMessage';

  // Enhanced loading state detection with minimum duration
  const isLoading = useMemo(() => {
    const isCurrentlyLoading = isAuthLoading || (!!user && (isDataLoading || status === 'pending'));

    // Start tracking loading time
    if (isCurrentlyLoading && loadingStartTime.current === null) {
      loadingStartTime.current = Date.now();
    }

    // If not actually loading anymore, check if minimum time elapsed
    if (!isCurrentlyLoading && loadingStartTime.current !== null) {
      const timeElapsed = Date.now() - loadingStartTime.current;
      if (timeElapsed < 500) {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }

        // Set a timeout to update after minimum time
        loadingTimeoutRef.current = setTimeout(() => {
          loadingStartTime.current = null;
          isInitialMount.current = false;
          setForceUpdate(prev => !prev);
        }, 500 - timeElapsed);

        return true;
      }
      // Reset timer and mark initial mount as done
      loadingStartTime.current = null;
      isInitialMount.current = false;
    }

    return isCurrentlyLoading;
  }, [isAuthLoading, user, isDataLoading, status, forceUpdate]);

  // Separate loading state for content that can show a loading indicator
  const isContentLoading = useMemo(() => {
    // Consider content loading if:
    // 1. User exists and data is being fetched
    // 2. OR if we're in the initial data loading phase
    return (!!user && isFetching) || (!!user && isDataLoading);
  }, [user, isFetching, isDataLoading, forceUpdate]);

  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null);
  }, [studyWords]);

  // Ensure data is fully processed before rendering
  const isDataReady = useMemo(() => {
    return !!user && !isContentLoading && validStudyWords.length > 0;
  }, [user, isContentLoading, validStudyWords.length]);

  // Use the vocabulary-stats utility to calculate stats
  const stats = useMemo(() => {
    return calculateVocabularyStats(validStudyWords, dueWordsData);
  }, [validStudyWords, dueWordsData]);

  // Generate weekly progress data based on actual review history using the utility
  const weeklyProgressData = useMemo(() => {
    return calculateWeeklyProgressData(validStudyWords);
  }, [validStudyWords]);

  // Function to start a review
  const handleStartReview = useCallback(() => {
    if (!user) return;

    // Invalidate the dueWords query first to ensure we get the freshest data
    queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });

    // Prefetch data before navigation for faster rendering
    queryClient.prefetchQuery({
      queryKey: ['dueWords', user.id],
      queryFn: () => studyWordsService.getStudyWords(user.id, { onlyDue: true }),
      staleTime: 0, // Ensure we get the freshest data
    });

    // Navigate immediately to improve perceived performance
    router.push('/review');
  }, [router, queryClient, user]);

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show sign-in message if not authenticated
  if (!user) {
    return (
      <SignInRequired
        headerTitle="Vocabulary"
        colors={colors}
        message="Please sign in to view and manage your vocabulary"
        benefitTitle="Benefits of Vocabulary Tracking"
        benefitDescription="Sign in to learn and review words with spaced repetition, track your progress, and build your vocabulary over time."
      />
    );
  }

  // Show error message if there was an error loading data
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage />
      </ThemedView>
    );
  }

  // Show empty state if no words
  if (!isContentLoading && validStudyWords.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <VocabularyEmptyState colors={colors} />
      </ThemedView>
    );
  }

  // Main content
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
        </View>

        {isContentLoading ? (
          <LoadingContainer style={styles.loadingContainer} />
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            <VocabularyDashboard
              totalWords={stats.totalWords}
              masteredWords={stats.masteredWords}
              learningWords={stats.learningWords}
              dueWords={stats.dueWords}
              streak={stats.streak}
              colors={colors}
            />

            <View style={styles.graphContainer}>
              <ThemedText style={styles.graphTitle}>Weekly Progress</ThemedText>
              <VocabularyGraph data={weeklyProgressData} />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {isDataReady && (
        <View style={styles.bottomContainer}>
          {stats.dueWords > 0 ? (
            <ReviewButton dueWords={stats.dueWords} onPress={handleStartReview} />
          ) : (
            <DisabledReviewButton />
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + 100,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
  },
  graphContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  graphTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  reviewButtonContainer: {
    width: '90%',
    maxWidth: 400,
  },
  reviewButton: {
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
  },
  loadingContainer: {
    marginTop: LAYOUT.SPACING.XLARGE * 2,
  },
});
