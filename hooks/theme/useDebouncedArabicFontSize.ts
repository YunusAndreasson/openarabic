import { useEffect, useState } from 'react';

import { useAppSelector } from '@/store/hooks';
import { selectArabicFontSize } from '@/store/settingsSlice';

/**
 * Hook that provides a debounced Arabic font size to prevent excessive re-renders
 * during slider interactions. Only updates the global state after a delay.
 */
export const useDebouncedArabicFontSize = (debounceMs: number = 150) => {
  // Clamped by the selector: a size from an older build, or outside the
  // slider's range, never reaches the renderer as-is.
  const selectedArabicFontSize = useAppSelector(selectArabicFontSize);
  const [debouncedFontSize, setDebouncedFontSize] = useState(selectedArabicFontSize);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFontSize(selectedArabicFontSize);
    }, debounceMs);

    // The cleanup is the debounce: a newer size (or unmount) cancels this one.
    return () => {
      clearTimeout(timeout);
    };
  }, [selectedArabicFontSize, debounceMs]);

  return debouncedFontSize;
};
