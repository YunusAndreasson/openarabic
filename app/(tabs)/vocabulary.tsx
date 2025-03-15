import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/VocabularyGraph';
import { VocabularyDashboard } from '@/components/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/VocabularyEmptyState';
import { SignInRequired } from '@/components/SignInRequired';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { useNavigation } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen, LoadingContainer } from '@/components/Loader';
import { VocabularyStats, WeeklyProgressData } from '@/types/vocabulary.types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabulary-stats';
import {
  useLoadingState,
  useScreenFocusRefresh,
  useScreenAnimation,
  useNavigationWithDebounce,
} from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { ReviewButton, DisabledReviewButton } from '@/components/vocabulary/ReviewButton';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const queryClient = useQueryClient();

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

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
  const handleStartReview = () => {
    if (!user) return;

    // Invalidate due words query to refresh after review
    queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });

    // Prefetch the review data to avoid the "no words" flash
    queryClient.prefetchQuery({
      queryKey: ['dueWords', user.id, 'review'],
      queryFn: () => studyWordsService.getStudyWords(user.id, { onlyDue: true }),
    });

    // Navigate to review screen
    navigateTo({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });
  };

  // Handle stat press events
  const handleStatPress = (category: 'total' | 'mastered' | 'learning' | 'due') => {
    // Navigate to the word list with the selected category
    navigateTo({
      pathname: '/wordList',
      params: { category },
    });
  };

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

  // Content loading state - simplified from a useMemo to a direct calculation
  const isContentLoading = !!user && (isFetching || isDataLoading);

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
    <Animated.View style={[styles.flexContainer, fadeInStyle]}>
      <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
        {/* Fixed header */}
        <PageHeader title="Vocabulary" />

        {/* Content */}
        <ThemedView
          scrollable={true}
          useSafeArea={false}
          includeBottomInset={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Show loader when loading */}
          {isContentLoading && (
            <View style={[styles.fullscreenLoader, { backgroundColor: colors.background }]}>
              <LoadingContainer size="large" color={colors.tint} />
            </View>
          )}

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
              onStatPress={handleStatPress}
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
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
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
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
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
  dashboardWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
