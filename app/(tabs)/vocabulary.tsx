import React, { useMemo, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/VocabularyGraph';
import { VocabularyDashboard } from '@/components/VocabularyDashboard';
import { ThemedButton } from '@/components/ThemedButton';
import { VocabularyEmptyState } from '@/components/VocabularyEmptyState';
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

// Create a memoized component for the sign-in message
const SignInMessage = React.memo(() => (
  <View
    style={[
      styles.messageContainer,
      { marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM },
    ]}
  >
    <ThemedText style={styles.message}>Please sign in to view your vocabulary.</ThemedText>
  </View>
));

SignInMessage.displayName = 'SignInMessage';

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

  const {
    data: studyWords = [],
    isLoading: isDataLoading,
    isFetching,
    status,
    error,
  } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

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

  // Clean up on unmount and focus change
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = undefined;
        }
        loadingStartTime.current = null;
      };
    }, [])
  );

  // Separate loading state for content that can show a loading indicator
  const isContentLoading = useMemo(() => !!user && isFetching, [user, isFetching, forceUpdate]);

  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null) as StudyWord[];
  }, [studyWords]);

  const stats = useMemo(() => {
    if (!validStudyWords.length)
      return { totalWords: 0, dueWords: 0, masteredWords: 0, learningWords: 0, streak: 0 };

    const now = new Date();
    const dueWords = validStudyWords.filter(word => new Date(word.next_review_at) <= now);
    const masteredWords = validStudyWords.filter(word => word.interval_days >= 30);
    const learningWords = validStudyWords.length - masteredWords.length;

    // Calculate streak based on review history
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find last review dates
    const reviewDates = validStudyWords
      .map(word => estimateLastReviewDate(word, now))
      .filter(Boolean) as Date[];

    if (reviewDates.length === 0) {
      return {
        totalWords: validStudyWords.length,
        dueWords: dueWords.length,
        masteredWords: masteredWords.length,
        learningWords,
        streak: 0,
      };
    }

    // Sort descending to get the most recent review first
    reviewDates.sort((a, b) => b.getTime() - a.getTime());

    const lastReviewDate = new Date(reviewDates[0]);
    lastReviewDate.setHours(0, 0, 0, 0);

    // Check if user has reviewed today
    const daysDifference = Math.floor(
      (today.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference > 1) {
      // Streak broken - more than 1 day since last review
      streak = 0;
    } else {
      // Count consecutive days with reviews
      let currentDate = new Date(today);
      let currentStreak = 0;
      const MAX_ITERATIONS = 366; // Safety limit (maximum 1 year of streak)
      let iterations = 0;

      // Group review dates by day
      const reviewDatesByDay = new Map();
      reviewDates.forEach(date => {
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        reviewDatesByDay.set(dateKey, true);
      });

      // Check for consecutive days backward in time
      while (iterations < MAX_ITERATIONS) {
        iterations++;
        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

        if (reviewDatesByDay.has(dateKey)) {
          currentStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      streak = currentStreak;
    }

    return {
      totalWords: validStudyWords.length,
      dueWords: dueWords.length,
      masteredWords: masteredWords.length,
      learningWords,
      streak,
    };
  }, [validStudyWords]);

  // Generate weekly progress data based on actual review history
  const weeklyProgressData = useMemo(() => {
    if (!validStudyWords.length)
      return Array(7)
        .fill(0)
        .map((_, i) => ({
          date: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
          wordsLearned: 0,
        }));

    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    // Create an array to hold the last 7 days with pre-initialized counts
    const dayMap = new Map();

    // Initialize the map with the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      dayMap.set(dayKey, {
        date: days[date.getDay()],
        wordsLearned: 0,
      });
    }

    // Count words learned per day based on estimated review dates
    validStudyWords.forEach(word => {
      const reviewDate = estimateLastReviewDate(word, now);
      if (reviewDate) {
        const dayKey = `${reviewDate.getFullYear()}-${reviewDate.getMonth()}-${reviewDate.getDate()}`;
        if (dayMap.has(dayKey)) {
          const dayData = dayMap.get(dayKey);
          dayData.wordsLearned += 1;
          dayMap.set(dayKey, dayData);
        }
      }
    });

    // Convert map back to array in the correct order
    return Array.from(dayMap.values());
  }, [validStudyWords]);

  const handleStartReview = useCallback(() => {
    router.push('/review');
  }, []);

  // Show loader while authentication is being checked OR while data is loading
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Only proceed after loading is complete
  if (!user) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
        </View>
        <SignInMessage />
      </ThemedView>
    );
  }

  // Show error state if data fetching failed
  if (error) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
        </View>
        <ErrorMessage />
      </ThemedView>
    );
  }

  if (!validStudyWords.length) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
        </View>
        <VocabularyEmptyState colors={colors} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
      </View>
      {isContentLoading ? (
        <LoadingContainer size="large" height={300} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: LAYOUT.SPACING.MEDIUM }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Vocabulary Dashboard */}
          <VocabularyDashboard
            totalWords={stats.totalWords}
            masteredWords={stats.masteredWords}
            dueWords={stats.dueWords}
            learningWords={stats.learningWords}
            streak={stats.streak}
            colors={colors}
          />

          {/* Weekly Progress Graph */}
          <VocabularyGraph
            data={weeklyProgressData}
            title="Words Learned This Week"
            isLoading={isContentLoading}
          />

          {/* Review Button - using memoized component */}
          {stats.dueWords > 0 && (
            <ReviewButton dueWords={stats.dueWords} onPress={handleStartReview} />
          )}
        </ScrollView>
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
  scrollContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButtonContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  reviewButton: {
    width: '100%',
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
});
