import { useCallback, useRef, useState } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent, ViewStyle } from 'react-native';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { AnimatedStyleProp } from '@/types/ui/base.types';

interface UseHeaderVisibilityOptions {
  threshold?: number;
  animationDuration?: number;
}

export interface UseHeaderVisibilityResult {
  isHeaderVisible: boolean;
  setIsHeaderVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  animatedStyle: AnimatedStyleProp<ViewStyle>;
}

export function useHeaderVisibility({
  threshold = 50,
  animationDuration = 200,
}: UseHeaderVisibilityOptions = {}): UseHeaderVisibilityResult {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYValue = useRef(0);
  const ticking = useRef(false);

  // Animated style for header opacity
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(isHeaderVisible ? 1 : 0, { duration: animationDuration }),
    }),
    [isHeaderVisible, animationDuration]
  );

  // Debounced scroll handler for performance
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (ticking.current) return;
      ticking.current = true;
      // Copy the value synchronously to avoid accessing pooled event
      const currentScrollY = event.nativeEvent.contentOffset.y;
      requestAnimationFrame(() => {
        const isScrollingDown = currentScrollY > prevScrollYValue.current;
        const isScrollingUp = currentScrollY < prevScrollYValue.current;
        if (isScrollingDown && isHeaderVisible && currentScrollY > threshold) {
          setIsHeaderVisible(false);
        } else if (isScrollingUp && !isHeaderVisible) {
          setIsHeaderVisible(true);
        }
        prevScrollYValue.current = currentScrollY;
        ticking.current = false;
      });
    },
    [isHeaderVisible, threshold]
  );

  return {
    isHeaderVisible,
    setIsHeaderVisible,
    handleScroll,
    animatedStyle,
  };
}
