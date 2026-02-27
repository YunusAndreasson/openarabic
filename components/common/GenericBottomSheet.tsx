import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';

import { BottomSheetErrorBoundary } from './BottomSheetErrorBoundary';
import { BottomSheetHeader } from './BottomSheetHeader';
import { useColors } from '@/hooks/theme/useColors';
import { COMMON_BOTTOM_SHEET_MODAL_PROPS, useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';

export interface GenericBottomSheetProps {
  /** Controls bottom sheet visibility */
  isVisible: boolean;
  /** Callback when sheet is dismissed */
  onClose: () => void;
  /** Optional title - renders BottomSheetHeader if provided */
  title?: string;
  /** Optional subtitle - requires title to be provided */
  subtitle?: string;
  /** Optional custom header - replaces title/subtitle if provided */
  customHeader?: ReactNode;
  /** Bottom sheet content */
  children: ReactNode;
  /** Optional snap points - uses dynamic sizing if not provided */
  snapPoints?: number[];
  /** Name for error boundary tracking - defaults to title or 'Generic' */
  sheetName?: string;
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
 * @example
 * // With custom header
 * <GenericBottomSheet
 *   isVisible={isVisible}
 *   onClose={onClose}
 *   customHeader={<MyCustomHeader />}
 * >
 *   <Content />
 * </GenericBottomSheet>
 */
export const GenericBottomSheet: FC<GenericBottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  subtitle,
  customHeader,
  children,
  snapPoints,
  sheetName,
}) => {
  const effectiveSheetName = sheetName || title || 'Generic';
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

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
    [onClose],
  );

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  // Memoize dynamic styles
  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator],
  );

  // When snapPoints are provided, disable dynamic sizing
  // Otherwise use dynamic sizing from COMMON_BOTTOM_SHEET_MODAL_PROPS
  const bottomSheetProps = useMemo(
    () => ({
      ...COMMON_BOTTOM_SHEET_MODAL_PROPS,
      ...(snapPoints ? { snapPoints, enableDynamicSizing: false } : { enableDynamicSizing: true }),
    }),
    [snapPoints],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onChange={handleChange}
      onDismiss={onClose}
      containerStyle={styles.modalContainer}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
      {...bottomSheetProps}
    >
      <BottomSheetView style={styles.container}>
        <BottomSheetErrorBoundary sheetName={effectiveSheetName}>
          {/* Render custom header OR standard title/subtitle header */}
          {customHeader ? (
            customHeader
          ) : title ? (
            <BottomSheetHeader title={title} subtitle={subtitle || ''} />
          ) : null}

          {/* Content */}
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
