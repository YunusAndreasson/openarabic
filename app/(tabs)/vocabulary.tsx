import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabulary-stats';
import { useLoadingState, useScreenFocusRefresh, useScreenAnimation } from '@/hooks';
import { usePulseAnimation } from '@/hooks/animations';
import PageHeader from '@/components/PageHeader';

// Create a memoized component for the review button
const ReviewButton = React.memo(
  ({ dueWords, onPress }: { dueWords: number; onPress: () => void }) => {
    const colors = useColors();
    // Use the existing pulse animation hook
    const { pulse, animatedStyle } = usePulseAnimation(1.05);

    const handlePress = useCallback(() => {
      // Trigger the pulse animation
      pulse();

      // Call onPress after a short delay to allow the animation to be visible
      setTimeout(() => {
        onPress();
      }, 150);
    }, [pulse, onPress]);

    return (
      <View style={styles.reviewButtonContainer}>
        <Animated.View style={animatedStyle}>
          <ThemedButton
            title={`Review ${dueWords} ${dueWords === 1 ? 'word' : 'words'}`}
            icon="play-circle"
            iconSize={24}
            onPress={handlePress}
            variant="filled"
            style={[styles.reviewButton, { backgroundColor: colors.tint }]}
          />
        </Animated.View>
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

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const queryClient = useQueryClient();
  const [isNavigating, setIsNavigating] = useState(false);

  // Use the loading state hook with a standard delay
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState(500, true);

  // Query for study words
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

  // Query for due words
  const { data: dueWordsData = [] } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { onlyDue: true }),
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for due words
    gcTime: 60000, // 1 minute
  });

  // Use the screen focus refresh hook
  useScreenFocusRefresh(
    queryClient,
    'dueWords',
    user?.id,
    0, // Always refresh due words
    true
  );

  useScreenFocusRefresh(
    queryClient,
    'studyWords',
    user?.id,
    60000, // 1 minute stale time
    true
  );

  // Filter valid study words
  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null);
  }, [studyWords]);

  // Check if data is ready to display
  const isDataReady = useMemo(() => {
    return !!user && !isDataLoading && validStudyWords.length > 0;
  }, [user, isDataLoading, validStudyWords.length]);

  // Calculate stats
  const stats = useMemo<VocabularyStats>(() => {
    return calculateVocabularyStats(validStudyWords, dueWordsData);
  }, [validStudyWords, dueWordsData]);

  // Calculate weekly progress data
  const weeklyProgressData = useMemo<WeeklyProgressData[]>(() => {
    return calculateWeeklyProgressData(validStudyWords);
  }, [validStudyWords]);

  // Handle starting a review
  const handleStartReview = useCallback(() => {
    if (!user || isNavigating) return;

    // Set navigating state to prevent multiple clicks
    setIsNavigating(true);

    // Invalidate due words query to refresh after review
    queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });

    // Prefetch the review data to avoid the "no words" flash
    queryClient.prefetchQuery({
      queryKey: ['dueWords', user.id, 'review'],
      queryFn: () => studyWordsService.getStudyWords(user.id, { onlyDue: true }),
    });

    // Simple navigation without animations
    router.push({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });

    // Reset navigation state after a delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  }, [router, queryClient, user, isNavigating]);

  // Use the screen animation hook
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoadingState || isDataLoading,
    300, // Animation duration
    0, // Layout delay
    0 // Animation delay
  );

  // Update loading state based on data loading
  useEffect(() => {
    if (isAuthLoading || (!!user && status === 'pending')) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isAuthLoading, user, status, startLoading, stopLoading]);

  // Content loading state
  const isContentLoading = useMemo(() => {
    return !!user && (isFetching || isDataLoading);
  }, [user, isFetching, isDataLoading]);

  // Create a memoized error message component
  const ErrorMessage = React.memo(() => {
    return (
      <View style={[styles.messageContainer, { marginTop: LAYOUT.SPACING.XLARGE }]}>
        <ThemedText style={[styles.message, { color: colors.error }]}>
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

  // Show loading screen for initial load
  if (isLoadingState) {
    return <LoadingScreen color={colors.tint} />;
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
    <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
      <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
        {/* Fixed header */}
        <PageHeader title="Vocabulary" />

        {/* Content area */}
        <View style={styles.contentContainer}>
          {/* Show loader when loading */}
          {isContentLoading && (
            <View style={[styles.fullscreenLoader, { backgroundColor: colors.background }]}>
              <LoadingContainer size="large" color={colors.tint} />
            </View>
          )}

          {/* Content */}
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
            {/* Dashboard Section */}
            <View style={styles.dashboardWrapper}>
              <VocabularyDashboard
                totalWords={stats.totalWords}
                masteredWords={stats.masteredWords}
                learningWords={stats.learningWords}
                dueWords={stats.dueWords}
                streak={stats.streak}
                colors={colors}
                animationTriggered={true}
              />
            </View>

            {/* Graph Section */}
            <View
              style={[
                styles.graphWrapper,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <VocabularyGraph data={weeklyProgressData} animationTriggered={true} />
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
          </ThemedView>
        </View>
      </ThemedView>
    </Animated.View>
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
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  fullscreenLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  sectionContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
    marginBottom: 0,
  },
  graphWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    height: 250,
  },
  reviewButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  reviewButtonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  reviewButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  articleInfoText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginLeft: LAYOUT.SPACING.TINY,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  dashboardWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
