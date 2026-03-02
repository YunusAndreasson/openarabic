import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { FC, ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';

import { BottomSheetErrorBoundary } from './BottomSheetErrorBoundary';
import { BottomSheetHeader } from './BottomSheetHeader';
import { useColors } from '@/hooks/theme/useColors';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';

const BOTTOM_SHEET_PROPS = {
  ...COMMON_BOTTOM_SHEET_MODAL_PROPS,
  enableDynamicSizing: true,
} as const;

export interface GenericBottomSheetProps {
  /** Controls bottom sheet visibility */
  isVisible: boolean;
  /** Callback when sheet is dismissed */
  onClose: () => void;
  /** Optional title - renders BottomSheetHeader if provided */
  title?: string;
  /** Optional subtitle - requires title to be provided */
  subtitle?: string;
  /** Bottom sheet content */
  children: ReactNode;
}

/**
 * Generic bottom sheet component that consolidates all common bottom sheet patterns.
 *
 * Use this component for any bottom sheet that needs:
 * - Standard visibility control (present/dismiss)
 * - Optional title/subtitle header
 * - Custom content
 *
 * @example
 * // With title and subtitle
 * <GenericBottomSheet
 *   isVisible={isVisible}
 *   onClose={onClose}
 *   title="Chart Title"
 *   subtitle="Chart description"
 * >
 *   <MyChart data={data} />
 * </GenericBottomSheet>
 *
 * @example
 * // With title only
 * <GenericBottomSheet
 *   isVisible={isVisible}
 *   onClose={onClose}
 *   title="Sleep Timer"
 * >
 *   <TimerOptions />
 * </GenericBottomSheet>
 *
 */
export const GenericBottomSheet: FC<GenericBottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isVisible]);

  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onDismiss={onClose}
      containerStyle={styles.modalContainer}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={BottomSheetBackdrop}
      {...BOTTOM_SHEET_PROPS}
    >
      <BottomSheetView style={styles.container}>
        <BottomSheetErrorBoundary sheetName={title ?? 'Generic'}>
          {title ? <BottomSheetHeader title={title} subtitle={subtitle || ''} /> : null}
          {children}
        </BottomSheetErrorBoundary>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

GenericBottomSheet.displayName = 'GenericBottomSheet';

const styles = StyleSheet.create({
  modalContainer: {
    zIndex: LAYOUT.Z_INDEX.MODAL, // Ensure modal appears above MiniPlayer
  },
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
});
