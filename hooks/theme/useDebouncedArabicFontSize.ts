import { useEffect, useRef, useState } from 'react';

import { clampArabicFontSize } from '@/constants/layout';
import { useAppSelector } from '@/store/hooks';

/**
 * Hook that provides a debounced Arabic font size to prevent excessive re-renders
 * during slider interactions. Only updates the global state after a delay.
 */
export const useDebouncedArabicFontSize = (debounceMs: number = 150) => {
  // Clamped at the point of use: `settings` is rehydrated straight from storage
  // with no migration, so a size from an older build reaches the renderer as-is.
  const selectedArabicFontSize = useAppSelector(state =>
    clampArabicFontSize(state.settings.arabicFontSize),
  );
  const [debouncedFontSize, setDebouncedFontSize] = useState(selectedArabicFontSize);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to update the debounced value
    timeoutRef.current = setTimeout(() => {
      setDebouncedFontSize(selectedArabicFontSize);
    }, debounceMs);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [selectedArabicFontSize, debounceMs]);

  return debouncedFontSize;
};
