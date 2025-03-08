import React, { useMemo, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
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
import { VocabularyStats, WeeklyProgressData } from '@/types/vocabulary.types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { FadeIn } from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabulary-stats';

// Create a memoized component for the review button
const ReviewButton = React.memo(
  ({ dueWords, onPress }: { dueWords: number; onPress: () => void }) => {
    return (
      <View style={styles.reviewButtonContainer}>
        <ThemedButton
          title={`Review ${dueWords} ${dueWords === 1 ? 'word' : 'words'}`}
          icon="play-circle"
          iconSize={24}
          onPress={onPress}
          variant="filled"
          style={styles.reviewButton}
        />
      </View>
    );
  }
);

// Create a memoized component for the disabled review button
const DisabledReviewButton = React.memo(() => {
  return (
    <View style={styles.reviewButtonContainer}>
      <ThemedButton
        title="No words to review"
        icon="time"
        iconSize={24}
        onPress={() => {}}
        variant="outlined"
        style={styles.reviewButton}
        disabled
      />
    </View>
  );
});

DisabledReviewButton.displayName = 'DisabledReviewButton';

// Remove the local implementation and use the imported function instead
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
  const ErrorMessage = React.memo(() => {
    return (
      <View style={[styles.messageContainer, { marginTop: LAYOUT.SPACING.XLARGE }]}>
        <ThemedText style={[styles.message, { color: colors.warning }]}>
          Error loading your vocabulary data. Please try again later.
        </ThemedText>
        <ThemedButton
          title="Retry"
          onPress={() => navigation.navigate('vocabulary')}
          style={{ marginTop: LAYOUT.SPACING.LARGE }}
        />
      </View>
    );
  });
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
  const stats = useMemo<VocabularyStats>(() => {
    return calculateVocabularyStats(validStudyWords, dueWordsData);
  }, [validStudyWords, dueWordsData]);

  // Generate weekly progress data based on actual review history using the utility
  const weeklyProgressData = useMemo<WeeklyProgressData[]>(() => {
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
    <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
      {/* Fixed header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
      </View>

      {/* Scrollable content */}
      {isContentLoading ? (
        <LoadingContainer style={styles.loadingContainer} />
      ) : (
        <ThemedView
          scrollable={true}
          useSafeArea={false}
          includeBottomInset={false}
          contentContainerStyle={{
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            paddingTop: LAYOUT.SPACING.MEDIUM,
            paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
          }}
        >
          <Animated.View entering={FadeIn.duration(300)}>
            {/* Dashboard Section */}
            <View style={styles.sectionContainer}>
              <VocabularyDashboard
                totalWords={stats.totalWords}
                masteredWords={stats.masteredWords}
                learningWords={stats.learningWords}
                dueWords={stats.dueWords}
                streak={stats.streak}
                colors={colors}
              />
            </View>

            {/* Graph Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.graphContainer}>
                <VocabularyGraph data={weeklyProgressData} />
              </View>
            </View>

            {/* Review Button Section */}
            {isDataReady && (
              <View style={styles.reviewButtonWrapper}>
                {stats.dueWords > 0 ? (
                  <ReviewButton dueWords={stats.dueWords} onPress={handleStartReview} />
                ) : (
                  <DisabledReviewButton />
                )}
              </View>
            )}
          </Animated.View>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
  },
  graphContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  reviewButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  reviewButtonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  reviewButton: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
