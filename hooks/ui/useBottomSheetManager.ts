import { useCallback, useState } from 'react';

/**
 * Hook for managing multiple mutually exclusive bottom sheets.
 *
 * Only one bottom sheet can be visible at a time. When a sheet is opened,
 * any previously open sheet is automatically closed.
 *
 * @example
 * ```tsx
 * type SheetKey = 'memory' | 'due' | 'streak' | 'mastered';
 *
 * const { activeSheet, showSheet, hideSheet, isVisible } = useBottomSheetManager<SheetKey>();
 *
 * // Show a specific sheet
 * const handleMemoryPress = () => showSheet('memory');
 *
 * // Check if a sheet is visible
 * <MemoryBottomSheet isVisible={isVisible('memory')} onClose={hideSheet} />
 *
 * // Or use activeSheet directly
 * <MemoryBottomSheet isVisible={activeSheet === 'memory'} onClose={hideSheet} />
 * ```
 */
export function useBottomSheetManager<T extends string>() {
  const [activeSheet, setActiveSheet] = useState<T | null>(null);

  /**
   * Show a specific bottom sheet (closes any currently open sheet)
   */
  const showSheet = useCallback((sheet: T) => {
    setActiveSheet(sheet);
  }, []);

  /**
   * Hide the currently visible bottom sheet
   */
  const hideSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);

  /**
   * Check if a specific sheet is currently visible
   */
  const isVisible = useCallback((sheet: T) => activeSheet === sheet, [activeSheet]);

  return {
    /** The currently active sheet key, or null if no sheet is open */
    activeSheet,
    /** Show a specific bottom sheet */
    showSheet,
    /** Hide the currently visible bottom sheet */
    hideSheet,
    /** Check if a specific sheet is visible */
    isVisible,
  };
}
