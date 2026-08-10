import type BottomSheet from '@gorhom/bottom-sheet';
import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

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

  // A native Android bottom sheet dismisses on hardware/gesture back; this one
  // is JS-driven and doesn't unless we wire it up ourselves. close() replays the
  // same onClose path a swipe-to-dismiss already takes, so callers need no change.
  useEffect(() => {
    if (Platform.OS !== 'android' || !isVisible) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      ref.current?.close();
      return true;
    });
    return () => subscription?.remove();
  }, [isVisible]);

  return ref;
}
