import type { JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StreakChart } from '@read/StreakChart';
import { StreakMetrics } from '@read/StreakMetrics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useStreakHistory } from '@/hooks/articles/useStreakHistory';

export default function ProgressModal(): JSX.Element {
  const insets = useSafeAreaInsets();

  const {
    streakHistory,
    isLoading: isStreakLoading,
    isError: isStreakError,
  } = useStreakHistory({
    enabled: true,
  });

  const hasError = isStreakError;
  const isLoading = isStreakLoading;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: LAYOUT.SPACING.LARGE,
            paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
          },
        ]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={true}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText type="body" colorName="textTertiary">
              Loading your progress data...
            </ThemedText>
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <ThemedText type="body" colorName="textTertiary">
              Unable to load progress data. Please try again.
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Streak Section - Condensed without section titles */}
            {streakHistory ? (
              <>
                {/* Header */}
                <View style={styles.headerContainer}>
                  <ThemedText type="heading1" weight="bold" style={styles.mainTitle}>
                    Reading Progress
                  </ThemedText>
                  <ThemedText type="body" colorName="textTertiary" style={styles.subtitle}>
                    Your daily reading consistency over the past 30 days
                  </ThemedText>
                </View>

                {/* Streak Metrics */}
                <View style={styles.streakMetricsContainer}>
                  <StreakMetrics metrics={streakHistory.metrics} />
                </View>

                {/* Streak Chart */}
                <View style={styles.chartContainer}>
                  <ThemedText type="heading3" weight="semibold" style={styles.chartTitle}>
                    Daily Activity
                  </ThemedText>
                  <ThemedText type="caption" colorName="textTertiary" style={styles.chartSubtitle}>
                    Track your reading patterns
                  </ThemedText>
                  <StreakChart
                    dailyActivity={streakHistory.dailyActivity}
                    streakPeriods={streakHistory.streakPeriods}
                  />
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  headerContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
  },
  mainTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  chartContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  chartTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  chartSubtitle: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.XXLARGE,
  },
  errorContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    flex: 1,
    justifyContent: 'center',
    margin: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.XXLARGE,
    ...LAYOUT.ELEVATION.SMALL,
  },
});
