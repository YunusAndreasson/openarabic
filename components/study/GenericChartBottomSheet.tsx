import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetHeader } from '@/components/common/BottomSheetHeader';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { COMMON_BOTTOM_SHEET_MODAL_PROPS, useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';

export interface GenericChartBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  chartComponent: ReactNode;
}

export const GenericChartBottomSheet: FC<GenericChartBottomSheetProps> = ({ isVisible, onClose, title, subtitle, chartComponent }) => {
  const colors = useColors();
  const { user } = useAuth();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Use FSRS queries to get study words data
  useFSRSQueries({
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

  // Handle sheet position changes - sync parent state when dismissed via gesture
  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  // Backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  const dynamicStyles = {
    bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
    indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onChange={handleChange}
      onDismiss={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
      {...COMMON_BOTTOM_SHEET_MODAL_PROPS}
    >
      <BottomSheetView style={styles.container}>
        <BottomSheetHeader title={title} subtitle={subtitle} />

        {/* Chart Content */}
        <View style={styles.chartContainer}>{chartComponent}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

GenericChartBottomSheet.displayName = 'GenericChartBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  chartContainer: {
    // No bottom margin - last section
  },
});
