import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallback } from 'react';

/**
 * Common backdrop component for bottom sheets
 * Reduces code duplication across all bottom sheet components
 */
export const useBottomSheetBackdrop = (onClose: () => void) => {
  return useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
    ),
    [onClose]
  );
};

/**
 * Common bottom sheet props for consistent behavior
 * Reduces prop duplication across all bottom sheet components
 */
export const COMMON_BOTTOM_SHEET_PROPS = {
  index: 0,
  enablePanDownToClose: true,
  enableOverDrag: false,
  enableDynamicSizing: false,
  animateOnMount: true,
  activeOffsetY: [-10, 10] as [number, number],
} as const;
