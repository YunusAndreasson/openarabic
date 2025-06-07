import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import React, { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@/components/SectionTitle';
import { ThemedView } from '@/components/ThemedView';
import { InfoModal, type InfoModalType } from '@/components/vocabulary/InfoModal';
import { EfficiencyChart, MasteryChart, RetrievabilityChart } from '@/components/vocabulary/charts';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { lightFeedback } from '@/utils/haptics';

export default function InsightsScreen(): JSX.Element {
  const { user } = useAuth();
  const isDarkMode = useIsDarkMode();
  const insets = useSafeAreaInsets();

  const [modalType, setModalType] = useState<InfoModalType | null>(null);

  // Use the FSRS queries hook for data fetching
  const { allWords: studyWords, error } = useFSRSQueries({
    userId: user?.id,
  });

  // Handle info modal
  const handleInfoPress = useCallback((type: InfoModalType) => {
    lightFeedback();
    setModalType(type);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalType(null);
  }, []);

  // Memoized info press handlers
  const handleMasteryInfo = useCallback(() => handleInfoPress('mastery'), [handleInfoPress]);
  const handleEfficiencyInfo = useCallback(() => handleInfoPress('efficiency'), [handleInfoPress]);
  const handleRetrievabilityInfo = useCallback(
    () => handleInfoPress('retrievability'),
    [handleInfoPress]
  );

  // Filter valid study words
  const validStudyWords = studyWords?.filter(word => word != null && word.root_id != null) ?? [];

  if (error) {
    return (
      <ThemedView style={styles.container} useSafeArea={false}>
        <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />
        <View style={styles.closeIndicator} />
        <View style={styles.errorContainer}>
          <SectionTitle title="Insights unavailable" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView accessibilityLabel="Insights screen" style={styles.container} useSafeArea={false}>
      <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />

      <View style={styles.closeIndicator} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: LAYOUT.SPACING.MEDIUM,
            paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
          },
        ]}
      >
        {/* Detailed Analytics */}
        <View style={styles.analyticsSection}>
          <View style={styles.firstChartContainer}>
            <SectionTitle
              isFirstSection={true}
              subtitle="Your vocabulary strength over time"
              title="Memory Strength"
              onInfoPress={handleMasteryInfo}
            />
            <MasteryChart
              hideTitle={true}
              studyWords={validStudyWords}
              onInfoPress={handleMasteryInfo}
            />
          </View>

          <View style={styles.chartContainer}>
            <SectionTitle
              subtitle="How quickly you learn new words"
              title="Learning Speed"
              onInfoPress={handleEfficiencyInfo}
            />
            <EfficiencyChart
              hideTitle={true}
              studyWords={validStudyWords}
              onInfoPress={handleEfficiencyInfo}
            />
          </View>

          <View style={[styles.chartContainer, styles.lastChart]}>
            <SectionTitle
              subtitle="Which words need review"
              title="Memory Retention"
              onInfoPress={handleRetrievabilityInfo}
            />
            <RetrievabilityChart
              hideTitle={true}
              studyWords={validStudyWords}
              onInfoPress={handleRetrievabilityInfo}
            />
          </View>
        </View>

        {/* Info Modal */}
        <InfoModal type={modalType} visible={modalType !== null} onClose={handleCloseModal} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  analyticsSection: {
    flex: 1,
  },
  chartContainer: {
    marginBottom: LAYOUT.SPACING.XXLARGE, // Optimized spacing for better visual hierarchy
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    // No top padding - SectionTitle handles spacing with isFirstSection
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  firstChartContainer: {
    marginBottom: LAYOUT.SPACING.XXLARGE, // Consistent spacing for visual hierarchy
  },
  lastChart: {
    marginBottom: LAYOUT.SPACING.LARGE, // Optimized bottom margin for perfect visual balance
  },
  closeIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 2,
    height: 4,
    marginTop: LAYOUT.SPACING.SMALL,
    width: 40,
  },
});
