import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GenericBottomSheet } from '@/components/common/GenericBottomSheet';
import { StreakChart } from '@/components/library/StreakChart';
import { StreakMetrics } from '@/components/library/StreakMetrics';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useStreakHistory } from '@/hooks/articles/useStreakHistory';

interface StreaksBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const StreaksBottomSheet = memo<StreaksBottomSheetProps>(({ isVisible, onClose }) => {
  const {
    streakHistory,
    isLoading: isStreakLoading,
    isError: isStreakError,
  } = useStreakHistory({
    // Always enabled - query has proper caching (5min staleTime, 10min gcTime)
    // This prevents loading flash when opening the modal
  });

  // Memoize content to prevent unnecessary re-renders
  const content = useMemo(() => {
    if (isStreakLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ThemedText type="body" colorName="textTertiary">
            Loading your streak
          </ThemedText>
        </View>
      );
    }

    if (isStreakError) {
      return (
        <View style={styles.errorContainer}>
          <ThemedText type="body" colorName="error">
            Can&apos;t load streak data. Try again
          </ThemedText>
        </View>
      );
    }

    if (streakHistory) {
      const hasActiveStreak = streakHistory.metrics.currentStreak > 0;
      const subtitle = hasActiveStreak
        ? 'Keep up the great momentum'
        : 'Start building your reading habit';

      return (
        <>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="heading3" weight="bold" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
              Reading streak
            </ThemedText>
            <ThemedText
              type="body"
              colorName="textTertiary"
              style={LAYOUT.BOTTOM_SHEET.STYLES.subtitle}
            >
              {subtitle}
            </ThemedText>
          </View>

          {/* Streak Metrics */}
          <View style={styles.streakMetricsContainer}>
            <StreakMetrics metrics={streakHistory.metrics} />
          </View>

          {/* Streak Chart */}
          <View style={styles.chartContainer}>
            <ThemedText type="heading3" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
              Last 30 days
            </ThemedText>
            <ThemedText
              type="body"
              colorName="textTertiary"
              style={[LAYOUT.BOTTOM_SHEET.STYLES.subtitle, styles.chartSubtitle]}
            >
              Each bar shows a reading day
            </ThemedText>
            <StreakChart
              dailyActivity={streakHistory.dailyActivity}
              streakPeriods={streakHistory.streakPeriods}
            />
          </View>
        </>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <ThemedText type="body" colorName="textTertiary">
          Start reading to build your streak
        </ThemedText>
      </View>
    );
  }, [isStreakLoading, isStreakError, streakHistory]);

  return (
    <GenericBottomSheet isVisible={isVisible} onClose={onClose}>
      {content}
    </GenericBottomSheet>
  );
});

StreaksBottomSheet.displayName = 'StreaksBottomSheet';

const styles = StyleSheet.create({
  // Section 1: Header (highest hierarchy)
  header: {
    ...LAYOUT.BOTTOM_SHEET.HEADER,
    marginBottom: LAYOUT.SPACING.LARGE, // 16px - tighter grouping with metric cards
  },
  // Section 2: Streak Metrics (secondary hierarchy)
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE, // 24px - clear section separation
  },
  // Section 3: Chart (tertiary hierarchy)
  chartContainer: {
    // No bottom margin - last section
  },
  chartSubtitle: {
    marginBottom: 0, // Tight coupling with chart below
  },
  // State containers
  loadingContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  errorContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
