import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallback } from 'react';
import { Dimensions } from 'react-native';

// Calculate screen height for maxDynamicContentSize
const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Common backdrop component for bottom sheet modals
 * Reduces code duplication across all bottom sheet modal components
 */
export const useBottomSheetBackdrop = (onClose: () => void) => {
  return useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close" // Prevents stuck backdrop by ensuring proper dismissal
        onPress={onClose}
      />
    ),
    [onClose],
  );
};

/**
 * Common bottom sheet props for consistent behavior
 * Reduces prop duplication across all bottom sheet components
 *
 * NOTE: index is -1 (closed) by default. Use expand() to show the sheet.
 */
export const COMMON_BOTTOM_SHEET_PROPS = {
  index: -1,
  enablePanDownToClose: true,
  enableOverDrag: false,
  enableDynamicSizing: false,
  animateOnMount: true,
  activeOffsetY: [-10, 10] as [number, number],
} as const;

/**
 * Common bottom sheet modal props for consistent behavior
 * Reduces prop duplication across all bottom sheet modal components
 *
 * NOTE: enableDynamicSizing is true to automatically fit content and prevent cutoff.
 * maxDynamicContentSize prevents sheets from exceeding 85% of screen height.
 */
export const COMMON_BOTTOM_SHEET_MODAL_PROPS = {
  enablePanDownToClose: true,
  enableOverDrag: false,
  enableDynamicSizing: true,
  maxDynamicContentSize: SCREEN_HEIGHT * 0.85, // Prevent sheets taller than screen
  activeOffsetY: [-10, 10] as [number, number],
} as const;
