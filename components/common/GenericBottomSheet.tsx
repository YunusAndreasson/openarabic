import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetHeader } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
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
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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

  // Memoize dynamic styles with safe area insets
  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
      container: [
        styles.container,
        { paddingBottom: Math.max(insets.bottom, LAYOUT.SPACING.MEDIUM) },
      ],
    }),
    [colors.elevation1, colors.modalIndicator, insets.bottom],
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
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
      {...bottomSheetProps}
    >
      <BottomSheetView style={dynamicStyles.container}>
        {/* Render custom header OR standard title/subtitle header */}
        {customHeader ? (
          customHeader
        ) : title ? (
          <BottomSheetHeader title={title} subtitle={subtitle || ''} />
        ) : null}

        {/* Content */}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

GenericBottomSheet.displayName = 'GenericBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    // paddingBottom handled dynamically with safe area insets
  },
});
