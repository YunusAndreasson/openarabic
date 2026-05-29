import type BottomSheet from '@gorhom/bottom-sheet';
import { useEffect, useRef } from 'react';

/**
 * Controls a BottomSheet's visibility by calling expand() / close()
 * based on the isVisible flag. Returns the ref to pass to the BottomSheet component.
 */
export function useBottomSheetVisibility(isVisible: boolean) {
  const ref = useRef<BottomSheet>(null);

  useEffect(() => {
    if (isVisible) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [isVisible]);

  return ref;
}
