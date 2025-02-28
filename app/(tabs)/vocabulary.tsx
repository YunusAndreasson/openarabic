import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/VocabularyGraph';
import { VocabularyDashboard } from '@/components/VocabularyDashboard';
import { ThemedButton } from '@/components/ThemedButton';
import { VocabularyEmptyState } from '@/components/VocabularyEmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen, LoadingContainer } from '@/components/Loader';
import { StudyWord } from '@/utils/vocabulary';

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

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();

  const {
    data: studyWords = [],
    isLoading: isDataLoading,
    isFetching,
    status,
  } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Enhanced loading state detection - cover all possible loading scenarios
  const isLoading = useMemo(
    () => isAuthLoading || (!!user && (isDataLoading || status === 'pending')),
    [isAuthLoading, user, isDataLoading, status]
  );

  // Separate loading state for content that can show a loading indicator
  const isContentLoading = useMemo(() => !!user && isFetching, [user, isFetching]);

  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null) as StudyWord[];
  }, [studyWords]);

  const stats = useMemo(() => {
    if (!validStudyWords.length)
      return { totalWords: 0, dueWords: 0, masteredWords: 0, learningWords: 0 };

    const now = new Date();
    const dueWords = validStudyWords.filter(word => new Date(word.next_review_at) <= now);
    const masteredWords = validStudyWords.filter(word => word.interval_days >= 30);
    const learningWords = validStudyWords.length - masteredWords.length;

    return {
      totalWords: validStudyWords.length,
      dueWords: dueWords.length,
      masteredWords: masteredWords.length,
      learningWords,
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

    // Get the days of the week
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

    // Count words learned per day based on review_count changes
    validStudyWords.forEach(word => {
      if (word.review_count > 0) {
        const reviewDate = new Date(word.next_review_at);
        // Adjust date back by interval days to estimate when the last review happened
        reviewDate.setDate(reviewDate.getDate() - word.interval_days);

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

  // Show loader while authentication is being checked OR while data is loading/fetching
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Only proceed after loading is complete
  if (!user) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <SignInMessage />
      </ThemedView>
    );
  }

  if (!validStudyWords.length) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <VocabularyEmptyState colors={colors} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {isContentLoading ? (
        <LoadingContainer size="large" height={300} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: LAYOUT.CONTENT_SPACING.TOP }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Vocabulary Dashboard */}
          <VocabularyDashboard
            totalWords={stats.totalWords}
            masteredWords={stats.masteredWords}
            dueWords={stats.dueWords}
            learningWords={stats.learningWords}
            streak={5}
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
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
  },
});
