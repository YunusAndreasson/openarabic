import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';

import { BottomSheetErrorBoundary } from './BottomSheetErrorBoundary';
import { BottomSheetHeader } from './BottomSheetHeader';
import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { useColors } from '@/hooks/theme/useColors';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';

const BOTTOM_SHEET_PROPS = {
  ...COMMON_BOTTOM_SHEET_MODAL_PROPS,
  enableDynamicSizing: true,
} as const;

export interface GenericBottomSheetProps {
  /** Optional callback fired after the sheet finishes dismissing */
  onClose?: () => void;
  /** Optional title - renders BottomSheetHeader if provided */
  title?: string;
  /** Optional subtitle - requires title to be provided */
  subtitle?: string;
  /** Bottom sheet content */
  children: ReactNode;
}

/**
 * Imperative handle exposed to parents — call `.present()` from a press handler
 * to open and `.dismiss()` to close. Matches the @gorhom/bottom-sheet
 * docs-recommended pattern of controlling the modal via a ref rather than
 * routing visibility through React state, which is fragile when modals
 * remount, dismiss animations race, or the same sheet is requested twice.
 */
export interface GenericBottomSheetHandle {
  present: () => void;
  dismiss: () => void;
}

/**
 * Generic bottom sheet component that consolidates all common bottom sheet patterns.
 *
 * Imperative API — open via ref:
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<GenericBottomSheetHandle>(null);
 * <Button onPress={() => sheetRef.current?.present()} />
 * <GenericBottomSheet ref={sheetRef} title="Chart">
 *   <MyChart />
 * </GenericBottomSheet>
 * ```
 */
export const GenericBottomSheet = forwardRef<GenericBottomSheetHandle, GenericBottomSheetProps>(
  function GenericBottomSheet({ onClose, title, subtitle, children }, ref) {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(
      ref,
      () => ({
        present: () => bottomSheetRef.current?.present(),
        dismiss: () => bottomSheetRef.current?.dismiss(),
      }),
      [],
    );

    const dynamicStyles = useMemo(
      () => ({
        bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      }),
      [colors.elevation1],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        onDismiss={onClose}
        containerStyle={styles.modalContainer}
        backgroundStyle={dynamicStyles.bottomSheet}
        handleComponent={BrandedBottomSheetHandle}
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
  },
);

GenericBottomSheet.displayName = 'GenericBottomSheet';

const styles = StyleSheet.create({
  modalContainer: {
    zIndex: LAYOUT.Z_INDEX.MODAL, // Ensure modal appears above MiniPlayer
  },
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
});
