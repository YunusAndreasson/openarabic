import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetHeader } from '@/components/common/BottomSheetHeader';
import { RetrievabilityChart } from '@/components/practice/charts/RetrievabilityChart';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { COMMON_BOTTOM_SHEET_MODAL_PROPS, useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';

export interface MemoryRetentionBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MemoryRetentionBottomSheet = memo<MemoryRetentionBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const colors = useColors();
    const { user } = useAuth();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    const { allWords: studyWords } = useFSRSQueries({
      userId: user?.id,
    });

    // Show/hide modal based on isVisible prop
    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.present();
      } else {
        bottomSheetRef.current?.dismiss();
      }
    }, [isVisible]);

    // Use common backdrop component
    const renderBackdrop = useBottomSheetBackdrop(onClose);

    const dynamicStyles = useMemo(
      () => ({
        bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
      }),
      [colors.elevation1, colors.modalIndicator]
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        onDismiss={onClose}
        backgroundStyle={dynamicStyles.bottomSheet}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={renderBackdrop}
        {...COMMON_BOTTOM_SHEET_MODAL_PROPS}
      >
        <BottomSheetView style={styles.container}>
          <BottomSheetHeader
            title={STRINGS.MEMORY_STRENGTH}
            subtitle={STRINGS.MEMORY_STRENGTH_SUBTITLE}
          />

          {/* Chart Content */}
          <View style={styles.chartContainer}>
            <RetrievabilityChart
              studyWords={studyWords ?? []}
              hideTitle={true}
              showWarningLine={true}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

MemoryRetentionBottomSheet.displayName = 'MemoryRetentionBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  // Perfect visual hierarchy container structure
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM, // Reduced from LARGE for tighter spacing
    paddingTop: LAYOUT.SPACING.MEDIUM, // 12px - breathing room from indicator
  },
  chartContainer: {
    // No bottom margin - last section
  },
});
