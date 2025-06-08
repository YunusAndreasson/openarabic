import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import SessionTypeModal from '@/components/vocabulary/SessionTypeModal';
import { VocabularyStatCards } from '@/components/vocabulary/VocabularyStatCards';
import { LAYOUT } from '@/constants/layout';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useVocabularyChartData } from '@/hooks/vocabulary/useVocabularyChartData';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { StatCategory } from '@/types/vocabulary.types';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { prefetchVocabularyData } = useAppPreloader();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Add state for refresh control and modal

  const [modalVisible, setModalVisible] = useState(false);

  // Combine focus effects for better performance
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
      const hasDueWords = queryClient.getQueryData(FSRS_QUERY_KEYS.due(user.id));

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        prefetchVocabularyData();
      }
    }, [user?.id, prefetchVocabularyData, queryClient])
  );

  // Use the FSRS queries hook for data fetching
  const {
    allWords: studyWords,
    dueWords: dueWordsData,
    isLoading: isDataLoading,
    isFetching,
    error,
  } = useFSRSQueries({
    userId: user?.id,
  });

  // Use the optimized vocabulary chart data hook that uses database views
  const { userStats, isLoadingUserStats } = useVocabularyChartData(user?.id);

  // Handle starting review for specific category - now shows modal
  const handleStartCategoryReview = useCallback(() => {
    if (!user) return;
    setModalVisible(true);
  }, [user]);

  // Handle modal actions
  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleStartAudio = useCallback(() => {
    setModalVisible(false);
    router.push('/practice/audio?fromRemember=true');
  }, [router]);

  const handleStartVisual = useCallback(() => {
    setModalVisible(false);
    router.push('/practice/review?fromRemember=true');
  }, [router]);

  // Handle stat press events
  const handleStatPress = (category: StatCategory) => {
    router.push(`/(tabs)/practice/wordList?category=${category}`);
  };

  // Show error message if there was an error loading data
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage />
      </ThemedView>
    );
  }

  // Check if data is cached and show loading indicator
  const isDataCached = !!(user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)));
  const showLoadingIndicator = (isDataLoading || isFetching || isLoadingUserStats) && !isDataCached;

  // Get stats - simplified for due words focus
  const dueWords = userStats?.dueWords ?? dueWordsData?.length ?? 0;

  // Main content
  return (
    <ThemedView
      accessibilityLabel="Vocabulary screen"
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
          },
        ]}
      >
        {/* Subtle loading indicator */}
        {showLoadingIndicator && (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator color={colors.tint} size="small" />
          </ThemedView>
        )}

        {/* PRIMARY SECTION: Learning Overview */}
        <VocabularyStatCards
          dueWords={dueWords}
          learningWords={userStats?.learningWords ?? 0}
          masteredWords={userStats?.masteredWords ?? 0}
          studyWords={studyWords?.filter(word => word != null && word.root_id != null) ?? []}
          onStatPress={handleStatPress}
          onStartReview={handleStartCategoryReview}
        />
      </ScrollView>

      {/* Session Type Modal */}
      <SessionTypeModal
        visible={modalVisible}
        onClose={handleModalClose}
        onStartAudio={handleStartAudio}
        onStartVisual={handleStartVisual}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.HIGH,
    paddingVertical: LAYOUT.SPACING.TINY, // Subtle loading indicator
  },
});
