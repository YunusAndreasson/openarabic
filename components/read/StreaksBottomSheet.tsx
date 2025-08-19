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

  // Snap points - same as other bottom sheets for consistency
  const SNAP_POINTS = [450]; // Compact height with minimal spacing
  const snapPoints = SNAP_POINTS;

  // Show/hide modal based on isVisible prop (same pattern as other bottom sheets)
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
    ),
    [onClose]
  );

  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator]
  );

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
      <BottomSheetView
        style={[styles.container, { minHeight: 450, padding: 20 }]}
        onLayout={event => {
          const { height, width } = event.nativeEvent.layout;
          console.log('🔥 BottomSheetView layout:', { height, width });
        }}
      >
        {isStreakLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText type="body" colorName="textTertiary">
              Loading streaks...
            </ThemedText>
          </View>
        ) : isStreakError ? (
          <View style={styles.errorContainer}>
            <ThemedText type="body" colorName="error">
              Failed to load streaks
            </ThemedText>
          </View>
        ) : streakHistory ? (
          <>
            {/* Header */}
            <View style={styles.header}>
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
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText type="body" colorName="textTertiary">
              No streak data available
            </ThemedText>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

StreaksBottomSheet.displayName = 'StreaksBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    width: 40,
    height: 4,
  },
  container: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  header: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  streakMetricsContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  chartContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  chartTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
  },
  loadingContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  errorContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
