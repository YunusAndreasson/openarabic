import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';

import { BottomSheetErrorBoundary } from './BottomSheetErrorBoundary';
import { BottomSheetHeader } from './BottomSheetHeader';
import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { useColors } from '@/hooks/theme/useColors';
import { useBottomSheetVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';

export interface GenericBottomSheetProps {
  /** Controls visibility. Parent owns the boolean state. */
  isVisible: boolean;
  /** Fired after the sheet finishes dismissing (e.g. via gesture or backdrop tap) */
  onClose: () => void;
  /** Optional title - renders BottomSheetHeader if provided */
  title?: string;
  /** Optional subtitle - requires title to be provided */
  subtitle?: string;
  /** Bottom sheet content */
  children: ReactNode;
}

/**
 * Generic inline bottom sheet — state-driven, native-friendly, works on Android.
 *
 * Previously used BottomSheetModal, which is broken on Android in this app. Now
 * uses the inline `<BottomSheet>` pattern (same as SettingsPicker / TimePicker)
 * which is the stable cross-platform option for component-tree-driven sheets.
 *
 * For sheets that should be route-driven, use a `Stack.Screen` with
 * `presentation: 'formSheet'` instead — see `app/sleep-timer.tsx`.
 */
export function GenericBottomSheet({
  isVisible,
  onClose,
  title,
  subtitle,
  children,
}: GenericBottomSheetProps) {
  const colors = useColors();
  const bottomSheetRef = useBottomSheetVisibility(isVisible);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      enableDynamicSizing={true}
      onClose={onClose}
      backgroundStyle={[styles.bottomSheet, { backgroundColor: colors.elevation1 }]}
      handleComponent={BrandedBottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
    >
      <BottomSheetView style={styles.container}>
        <BottomSheetErrorBoundary sheetName={title ?? 'Generic'}>
          {title ? <BottomSheetHeader title={title} subtitle={subtitle || ''} /> : null}
          {children}
        </BottomSheetErrorBoundary>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  container: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
});
