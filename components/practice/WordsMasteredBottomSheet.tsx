import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetHeader } from '@/components/common/BottomSheetHeader';
import { MasteryChart } from '@/components/practice/charts/MasteryChart';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

export interface WordsMasteredBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const SNAP_POINTS = [450]; // Compact height with minimal spacing

export const WordsMasteredBottomSheet = memo<WordsMasteredBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const colors = useColors();
    const { user } = useAuth();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const { allWords: studyWords } = useFSRSQueries({
      userId: user?.id,
    });

    // Snap point is static so define outside component
    const snapPoints = SNAP_POINTS;

    // Show/hide modal based on isVisible prop (same pattern as other bottom sheets)
    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);

    // Use built-in backdrop component (same as other bottom sheets)
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={onClose}
        />
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
        <BottomSheetView style={styles.container}>
          <BottomSheetHeader
            title={STRINGS.WORD_MASTERY}
            subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
          />

          {/* Chart Content */}
          <View style={styles.chartContainer}>
            <MasteryChart studyWords={studyWords ?? []} hideTitle={true} />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

WordsMasteredBottomSheet.displayName = 'WordsMasteredBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  // Perfect visual hierarchy container structure
  container: {
    paddingHorizontal: LAYOUT.SPACING.LARGE, // 16px - consistent horizontal padding
    paddingTop: LAYOUT.SPACING.MEDIUM, // 12px - breathing room from indicator
  },
  chartContainer: {
    // No bottom margin - last section
  },
});
