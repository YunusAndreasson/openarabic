import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { StreakChart } from '@/components/read/StreakChart';
import { StreakMetrics } from '@/components/read/StreakMetrics';
import { LAYOUT } from '@/constants/layout';
import { useStreakHistory } from '@/hooks/articles/useStreakHistory';
import { useColors } from '@/hooks/theme/useColors';

interface StreaksBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const StreaksBottomSheet = memo<StreaksBottomSheetProps>(({ isVisible, onClose }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colors = useColors();

  const {
    streakHistory,
    isLoading: isStreakLoading,
    isError: isStreakError,
  } = useStreakHistory({
    enabled: isVisible, // Only fetch when visible
  });

  // Use a much smaller height to eliminate bottom padding
  const snapPoints = [400];

  // Show/hide modal based on isVisible prop (same pattern as other bottom sheets)
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Memoize backdrop component to prevent recreation
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
    ),
    [onClose]
  );

  // Memoize dynamic styles
  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator]
  );

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
      return (
        <>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="heading3" weight="bold">
              Your reading streak
            </ThemedText>
            <ThemedText type="body" colorName="textTertiary" style={styles.subtitle}>
              Keep up the great momentum
            </ThemedText>
          </View>

          {/* Streak Metrics */}
          <View style={styles.streakMetricsContainer}>
            <StreakMetrics metrics={streakHistory.metrics} />
          </View>

          {/* Streak Chart */}
          <View style={styles.chartContainer}>
            <ThemedText type="heading3" weight="semibold" style={styles.chartTitle}>
              Last 30 days
            </ThemedText>
            <ThemedText type="caption" colorName="textTertiary" style={styles.chartSubtitle}>
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

  // Only render when visible (same pattern as other bottom sheets)
  if (!isVisible) {
    return null;
  }

  // TEMPORARY: Simple test BottomSheet
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      animateOnMount={true}
      activeOffsetY={[-10, 10]}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.container}>{content}</BottomSheetView>
    </BottomSheet>
  );
});

StreaksBottomSheet.displayName = 'StreaksBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  // Perfect visual hierarchy container structure
  container: {
    paddingHorizontal: LAYOUT.SPACING.LARGE, // 16px - consistent horizontal padding
    paddingTop: LAYOUT.SPACING.MEDIUM, // 12px - breathing room from indicator
  },
  // Section 1: Header (highest hierarchy)
  header: {
    ...LAYOUT.BOTTOM_SHEET.HEADER,
    marginBottom: LAYOUT.SPACING.XLARGE, // 24px - major section separation
  },
  mainTitle: {
    marginBottom: LAYOUT.SPACING.TINY, // 4px - tight coupling with subtitle
    textAlign: 'center',
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // 15px - secondary descriptive text
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  // Section 2: Streak Metrics (secondary hierarchy)
  streakMetricsContainer: {
    marginBottom: LAYOUT.SPACING.LARGE, // 16px - moderate section separation
  },
  // Section 3: Chart (tertiary hierarchy)
  chartContainer: {
    // No bottom margin - last section
  },
  chartTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE, // 20px - section title (1.4x ratio from 15px subtitle)
    marginBottom: LAYOUT.SPACING.TINY, // 4px - tight coupling with subtitle
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // 13px - tertiary descriptive text (1.54x ratio from 20px)
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY, // 4px - minimal space before chart
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
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
