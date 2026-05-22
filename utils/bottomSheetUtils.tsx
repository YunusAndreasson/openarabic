import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useBottomSheet } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { memo, useCallback, useMemo, useState } from 'react';
import type { ViewProps } from 'react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useBlurProps } from '@/hooks/ui/useBlurProps';

// Calculate screen height for maxDynamicContentSize
const SCREEN_HEIGHT = Dimensions.get('window').height;

const BACKDROP_OPACITY = 0.4;
const APPEARS_ON_INDEX = 0;
const DISAPPEARS_ON_INDEX = -1;

/**
 * Custom backdrop with BlurView as the background layer.
 *
 * Only calls close() on tap — parent state sync is handled by the BottomSheet's
 * onClose/onDismiss prop after the close animation completes. This prevents
 * content flash during close animation and avoids redundant re-renders.
 */
const BlurBackdropComponent = ({ animatedIndex, style }: BottomSheetBackdropProps) => {
  const { close } = useBottomSheet();
  const { intensity, tint } = useBlurProps('backdrop');
  const [pointerEvents, setPointerEvents] = useState<ViewProps['pointerEvents']>('auto');

  const handleContainerTouchability = useCallback((shouldDisable: boolean) => {
    setPointerEvents(shouldDisable ? 'none' : 'auto');
  }, []);

  const tapHandler = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        scheduleOnRN(close);
      }),
    [close],
  );

  const animatedOpacity = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        animatedIndex.value,
        [-1, DISAPPEARS_ON_INDEX, APPEARS_ON_INDEX],
        [0, 0, BACKDROP_OPACITY],
        Extrapolation.CLAMP,
      ),
    }),
    [animatedIndex],
  );

  useAnimatedReaction(
    () => {
      'worklet';
      return animatedIndex.value <= DISAPPEARS_ON_INDEX;
    },
    (shouldDisable, previous) => {
      if (shouldDisable !== previous) {
        scheduleOnRN(handleContainerTouchability, shouldDisable);
      }
    },
    [],
  );

  const containerStyle = useMemo(
    () => [styles.backdrop, style, animatedOpacity],
    [style, animatedOpacity],
  );

  return (
    <GestureDetector gesture={tapHandler}>
      <Animated.View style={containerStyle} pointerEvents={pointerEvents}>
        <BlurView
          intensity={intensity}
          tint={tint}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={styles.blur}
        />
      </Animated.View>
    </GestureDetector>
  );
};

/**
 * Backdrop component for bottom sheet modals with blur effect.
 * Use directly as the backdropComponent prop on BottomSheet/BottomSheetModal.
 */
export const BottomSheetBackdrop = memo(BlurBackdropComponent);

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

/**
 * Common props shared by both BottomSheet and BottomSheetModal components.
 * Use this for plain BottomSheet instances.
 */
export const COMMON_BOTTOM_SHEET_PROPS = {
  enablePanDownToClose: true,
  enableOverDrag: false,
  activeOffsetY: [-10, 10] as [number, number],
  maxDynamicContentSize: SCREEN_HEIGHT * 0.85, // Prevent sheets taller than screen
} as const;

/**
 * Common bottom sheet modal props for consistent behavior.
 * Superset of COMMON_BOTTOM_SHEET_PROPS with modal-specific additions.
 * Use this for BottomSheetModal instances.
 *
 * maxDynamicContentSize prevents sheets from exceeding 85% of screen height.
 *
 * enableDismissOnClose=false keeps the modal mounted across present/dismiss
 * cycles — otherwise the default (true) unmounts it on close, briefly nulling
 * the ref. Subsequent `present()` calls hit a null ref and silently no-op,
 * which is the "tap once it works, then 10 taps in a row do nothing" bug.
 */
export const COMMON_BOTTOM_SHEET_MODAL_PROPS = {
  ...COMMON_BOTTOM_SHEET_PROPS,
  enableBlurKeyboardOnGesture: true, // Auto-dismiss keyboard on gesture drag
  stackBehavior: 'replace' as const, // Dismiss previous modal when opening a new one
  enableDismissOnClose: false, // Keep modal mounted so ref stays valid across re-opens
} as const;
