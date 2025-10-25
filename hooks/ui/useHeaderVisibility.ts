import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { HEADER_SCROLL_THRESHOLD } from '@/constants/animation';

interface UseHeaderVisibilityOptions {
  threshold?: number;
  animationDuration?: number;
}

export interface UseHeaderVisibilityResult {
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function useHeaderVisibility({
  threshold = HEADER_SCROLL_THRESHOLD,
}: UseHeaderVisibilityOptions = {}): UseHeaderVisibilityResult {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYValue = useRef(0);
  const ticking = useRef(false);

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
    [isHeaderVisible, threshold],
  );

  return {
    handleScroll,
  };
}
