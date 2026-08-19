import BottomSheet from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';

import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';
import { useBottomSheetVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';

interface BrandedBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Shared branded shell and visibility lifecycle for app-owned bottom sheets. */
export function BrandedBottomSheet({ isVisible, onClose, children }: BrandedBottomSheetProps) {
  const bottomSheetRef = useBottomSheetVisibility(isVisible);
  const dynamicStyles = useBottomSheetDynamicStyles();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      enableDynamicSizing
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleComponent={BrandedBottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
    >
      {children}
    </BottomSheet>
  );
}
