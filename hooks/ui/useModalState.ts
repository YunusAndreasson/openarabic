import { useCallback, useMemo, useState } from 'react';

/**
 * Generic hook for managing modal/bottom sheet state with optional data payload
 * Consolidates the common pattern of isVisible + selectedItem state management
 *
 * @template T - Type of data associated with the modal (e.g., word, article, etc.)
 * @returns Object with visibility state, data, and open/close handlers
 *
 * @example
 * ```typescript
 * const wordModal = useModalState<SentenceWord>();
 * // ... later
 * wordModal.open(selectedWord);
 * // ... in JSX
 * <BottomSheet isVisible={wordModal.isVisible} onClose={wordModal.close}>
 *   {wordModal.data && <WordDetails word={wordModal.data} />}
 * </BottomSheet>
 * ```
 */
export function useModalState<T>() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<T | null>(null);

  /**
   * Opens the modal with optional data payload
   * @param payload - Data to associate with the modal (optional)
   */
  const open = useCallback((payload?: T) => {
    if (payload !== undefined) {
      setData(payload);
    }
    setIsVisible(true);
  }, []);

  /**
   * Closes the modal and clears the data
   */
  const close = useCallback(() => {
    setIsVisible(false);
    setData(null);
  }, []);

  /**
   * Toggles the modal visibility
   * If closing, data is cleared. If opening, optional payload can be provided.
   * @param payload - Data to associate when opening (optional)
   */
  const toggle = useCallback(
    (payload?: T) => {
      if (isVisible) {
        close();
      } else {
        open(payload);
      }
    },
    [isVisible, open, close],
  );

  // Memoize the return object to prevent unnecessary re-renders in dependent components
  return useMemo(
    () => ({
      isVisible,
      data,
      open,
      close,
      toggle,
    }),
    [isVisible, data, open, close, toggle],
  );
}
