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
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation, useComponentAnimation } from '@/hooks/animations';
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

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const loadingStartTime = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const [forceUpdate, setForceUpdate] = useState(false);
  const queryClient = useQueryClient();

  // Animation state
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const { animatedStyle: fadeInStyle, startAnimation: startFadeIn } = useFadeInAnimation(0, 400);

  // Layout ready state to prevent jumping
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Set layout ready after first render
  useEffect(() => {
    // Use requestAnimationFrame to ensure layout is calculated
    requestAnimationFrame(() => {
      setIsLayoutReady(true);
    });
  }, []);

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

  // Initial loading state
  const isLoading = useMemo(() => {
    return isAuthLoading || (!!user && status === 'pending');
  }, [isAuthLoading, user, status]);

  // Content loading state
  const isContentLoading = useMemo(() => {
    return !!user && (isFetching || isDataLoading);
  }, [user, isFetching, isDataLoading]);

  // Filter valid study words
  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null);
  }, [studyWords]);

  // Check if data is ready to display
  const isDataReady = useMemo(() => {
    return !!user && !isContentLoading && validStudyWords.length > 0;
  }, [user, isContentLoading, validStudyWords.length]);

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
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
    router.push('/review');
  }, [router, queryClient, user]);

  // Trigger animations when data is ready
  useEffect(() => {
    if (isDataReady && !animationsTriggered && !isContentLoading && isLayoutReady) {
      // Start animations immediately without delay
      startFadeIn();
      setAnimationsTriggered(true);
    }
  }, [isDataReady, animationsTriggered, isContentLoading, startFadeIn, isLayoutReady]);

  // Show loading screen for initial load
  if (isLoading) {
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
    <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
      {/* Fixed header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Vocabulary</ThemedText>
      </View>

      {/* Content area */}
      <View style={styles.contentContainer}>
        {/* Show loader when loading */}
        {isContentLoading && (
          <View style={[styles.fullscreenLoader, { backgroundColor: colors.background }]}>
            <LoadingContainer size="large" color={colors.tint} />
          </View>
        )}

        {/* Content - initially invisible until animation starts */}
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
          {isLayoutReady && (
            <Animated.View style={[{ width: '100%', opacity: 0 }, fadeInStyle]}>
              {/* Dashboard Section */}
              <View style={styles.dashboardWrapper}>
                <VocabularyDashboard
                  totalWords={stats.totalWords}
                  masteredWords={stats.masteredWords}
                  learningWords={stats.learningWords}
                  dueWords={stats.dueWords}
                  streak={stats.streak}
                  colors={colors}
                  animationTriggered={animationsTriggered}
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
                <VocabularyGraph
                  data={weeklyProgressData}
                  animationTriggered={animationsTriggered}
                />
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
          )}
        </ThemedView>
      </View>
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
