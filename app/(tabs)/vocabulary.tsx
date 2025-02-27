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
import { getMotivationalMessage, StudyWord } from '@/utils/vocabulary';

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
  const isLoading =
    isAuthLoading || (!!user && (isDataLoading || isFetching || status === 'pending'));

  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null) as StudyWord[];
  }, [studyWords]);

  const stats = useMemo(() => {
    const now = new Date();
    const dueWords = validStudyWords.filter(word => new Date(word.next_review_at) <= now);
    const masteredWords = validStudyWords.filter(word => word.interval_days >= 30);
    const learningWords = validStudyWords.filter(word => word.interval_days < 30);

    return {
      totalWords: validStudyWords.length,
      dueWords: dueWords.length,
      masteredWords: masteredWords.length,
      learningWords: learningWords.length,
    };
  }, [validStudyWords]);

  // Generate weekly progress data based on actual review history
  const weeklyProgressData = useMemo(() => {
    // Get the days of the week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    // We don't need dayOfWeek variable, so removing it

    // Create an array to hold the last 7 days
    const last7Days = Array(7)
      .fill(0)
      .map((_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return {
          date: days[date.getDay()],
          fullDate: date,
          wordsLearned: 0,
        };
      });

    // Count words learned per day based on review_count changes
    validStudyWords.forEach(word => {
      // This is an approximation since we don't have the exact review history
      // In a real app, you would have a reviews table with timestamps
      if (word.review_count > 0) {
        const reviewDate = new Date(word.next_review_at);
        // Adjust date back by interval days to estimate when the last review happened
        reviewDate.setDate(reviewDate.getDate() - word.interval_days);

        // Check if the review date falls within our 7-day window
        for (let i = 0; i < 7; i++) {
          const dayData = last7Days[i];
          if (
            reviewDate.getDate() === dayData.fullDate.getDate() &&
            reviewDate.getMonth() === dayData.fullDate.getMonth() &&
            reviewDate.getFullYear() === dayData.fullDate.getFullYear()
          ) {
            dayData.wordsLearned += 1;
            break;
          }
        }
      }
    });

    // Return the data without the fullDate property
    return last7Days.map(({ date, wordsLearned }) => ({ date, wordsLearned }));
  }, [validStudyWords]);

  const motivationalMessage = useMemo(() => getMotivationalMessage(stats), [stats]);

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
        <View
          style={[
            styles.messageContainer,
            { marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM },
          ]}
        >
          <ThemedText style={styles.message}>Please sign in to view your vocabulary.</ThemedText>
        </View>
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

  const hasDueWords = stats.dueWords > 0;

  // Add a fallback loading state check for when data is still loading after initial load
  const isStillLoading = isFetching || status === 'pending';

  return (
    <ThemedView style={styles.container}>
      {isStillLoading ? (
        <LoadingContainer size="large" height={300} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: LAYOUT.CONTENT_SPACING.TOP }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Motivational message */}
          <View style={styles.messageHeader}>
            <ThemedText style={styles.motivationalText}>{motivationalMessage}</ThemedText>
          </View>

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
            isLoading={isStillLoading}
          />

          {/* Review Button - using standard ThemedButton */}
          {hasDueWords && (
            <View style={styles.reviewButtonContainer}>
              <ThemedButton
                title={`Review ${stats.dueWords} ${stats.dueWords === 1 ? 'word' : 'words'}`}
                icon="play-circle"
                onPress={handleStartReview}
                variant="filled"
                style={styles.reviewButton}
              />
            </View>
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
  messageHeader: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  motivationalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
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
