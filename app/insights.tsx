import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useCallback, JSX, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@/components/SectionTitle';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useNavigationWithDebounce } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useStreakData } from '@/hooks/useStreakData';
import type { StatCategory } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

import { InfoModal, type InfoModalType } from '../components/vocabulary/InfoModal';
import { StreakCard } from '../components/vocabulary/StreakCard';
import {
  DifficultyChart,
  EfficiencyChart,
  MasteryChart,
  RetrievabilityChart,
} from '../components/vocabulary/charts';

export default function InsightsScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { navigateTo } = useNavigationWithDebounce();

  const [modalType, setModalType] = useState<InfoModalType | null>(null);

  // Get streak data
  const { currentStreak, longestStreak, lastSevenDaysActivity } = useStreakData(user?.id);

  // Use the FSRS queries hook for data fetching
  const {
    allWords: studyWords,
    isLoading: isDataLoading,
    error,
  } = useFSRSQueries({
    userId: user?.id,
  });

  // Handle stat press events
  const handleStatPress = (category: StatCategory) => {
    navigateTo({
      pathname: '/wordList',
      params: { category },
    });
  };

  // Handle info modal
  const handleInfoPress = useCallback((type: InfoModalType) => {
    lightFeedback();
    setModalType(type);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalType(null);
  }, []);

  // Memoized info press handlers
  const handleStreakInfo = useCallback(() => handleInfoPress('streak'), [handleInfoPress]);
  const handleMasteryInfo = useCallback(() => handleInfoPress('mastery'), [handleInfoPress]);
  const handleEfficiencyInfo = useCallback(() => handleInfoPress('efficiency'), [handleInfoPress]);
  const handleRetrievabilityInfo = useCallback(
    () => handleInfoPress('retrievability'),
    [handleInfoPress]
  );
  const handleDifficultyInfo = useCallback(() => handleInfoPress('difficulty'), [handleInfoPress]);

  // Filter valid study words
  const validStudyWords = studyWords?.filter(word => word != null && word.root_id != null) ?? [];

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingTop: headerHeight }]}>
          <SectionTitle title="Error loading insights" />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Insights',
          headerTitleStyle: {
            ...LAYOUT.HEADER.TITLE.SECONDARY,
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTransparent: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Remember',
          headerBackTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          },
        }}
      />
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        accessibilityLabel="Vocabulary insights screen"
      >
        <ScrollView
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Streak Section */}
          <View style={styles.firstChartContainer}>
            <SectionTitle
              title="Your Streak"
              subtitle="Track your daily learning habit"
              onInfoPress={handleStreakInfo}
              isFirstSection={true}
            />
            <StreakCard
              currentStreak={currentStreak}
              longestStreak={longestStreak}
              lastSevenDaysActivity={lastSevenDaysActivity}
              onInfoPress={handleStreakInfo}
              hideTitle={true}
            />
          </View>

          {/* Detailed Analytics */}
          <View style={styles.analyticsSection}>
            <View style={styles.chartContainer}>
              <SectionTitle
                title="Memory Strength"
                subtitle="Track how well you remember each word"
                onInfoPress={handleMasteryInfo}
              />
              <MasteryChart
                studyWords={validStudyWords}
                onInfoPress={handleMasteryInfo}
                onStatPress={handleStatPress}
                hideTitle={true}
              />
            </View>

            <View style={styles.chartContainer}>
              <SectionTitle
                title="Learning Speed"
                subtitle="See how fast you master new vocabulary"
                onInfoPress={handleEfficiencyInfo}
              />
              <EfficiencyChart
                studyWords={validStudyWords}
                onInfoPress={handleEfficiencyInfo}
                learningWords={0}
                onStatPress={handleStatPress}
                hideTitle={true}
              />
            </View>

            <View style={styles.chartContainer}>
              <SectionTitle
                title="Memory Retention"
                subtitle="Monitor which words you're forgetting"
                onInfoPress={handleRetrievabilityInfo}
              />
              <RetrievabilityChart
                studyWords={validStudyWords}
                onInfoPress={handleRetrievabilityInfo}
                onStatPress={handleStatPress}
                hideTitle={true}
              />
            </View>

            <View style={[styles.chartContainer, styles.lastChart]}>
              <SectionTitle
                title="Challenge Level"
                subtitle="Identify your most difficult words"
                onInfoPress={handleDifficultyInfo}
              />
              <DifficultyChart
                studyWords={validStudyWords}
                onInfoPress={handleDifficultyInfo}
                onDifficultyPress={handleStatPress}
                onStatPress={handleStatPress}
                hideTitle={true}
              />
            </View>
          </View>

          {/* Info Modal */}
          <InfoModal type={modalType} visible={modalType !== null} onClose={handleCloseModal} />
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  analyticsSection: {
    flex: 1,
  },
  chartContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  firstChartContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
    marginTop: -LAYOUT.SPACING.SMALL, // Reduce top spacing to match vocabulary screen
  },
  lastChart: {
    marginBottom: 0,
  },
});
