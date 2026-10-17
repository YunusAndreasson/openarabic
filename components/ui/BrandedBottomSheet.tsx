import BottomSheet, { useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import { useImperativeHandle, type ReactNode, type Ref } from 'react';
import { useWindowDimensions } from 'react-native';

import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { SPRING_CONFIG } from '@/constants/animation';
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';
import { useBottomSheetVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import {
  BottomSheetBackdrop,
  COMMON_BOTTOM_SHEET_PROPS,
  SHEET_MAX_HEIGHT_RATIO,
} from '@/utils/bottomSheetUtils';

export interface BrandedBottomSheetMethods {
  close: () => void;
}

interface BrandedBottomSheetProps {
  ref?: Ref<BrandedBottomSheetMethods>;
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Shared branded shell and visibility lifecycle for app-owned bottom sheets. */
export function BrandedBottomSheet({ ref, isVisible, onClose, children }: BrandedBottomSheetProps) {
  const bottomSheetRef = useBottomSheetVisibility(isVisible);
  const dynamicStyles = useBottomSheetDynamicStyles();
  const animationConfigs = useBottomSheetSpringConfigs(SPRING_CONFIG.BOTTOM_SHEET);
  const { height: windowHeight } = useWindowDimensions();

  // Request the animation without clearing the caller's content. onClose is
  // the completion notification for buttons, back, backdrop and swipe alike.
  useImperativeHandle(ref, () => ({ close: () => bottomSheetRef.current?.close() }), [
    bottomSheetRef,
  ]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      maxDynamicContentSize={windowHeight * SHEET_MAX_HEIGHT_RATIO}
      // gorhom defaults the content wrapper to accessible="true" (label "Bottom
      // Sheet", role "adjustable"). On iOS that collapses the whole sheet into
      // ONE VoiceOver element, so nothing inside it — "Add to practice", every
      // picker option, the time picker — could be focused or activated.
      accessible={false}
      enableDynamicSizing
      animationConfigs={animationConfigs}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleComponent={BrandedBottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
    >
      {children}
    </BottomSheet>
  );
}
