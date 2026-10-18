import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { FAQ_DATA, type FAQCategoryData } from '@/constants/faq';

interface UseFAQSearchOptions {
  /** Item ID to auto-expand on mount (from URL params) */
  initialExpandedItem?: string;
}

interface UseFAQSearchResult {
  /** Current search query */
  searchQuery: string;
  /** Set the search query */
  setSearchQuery: (query: string) => void;
  /** Clear the search query */
  clearSearch: () => void;
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Toggle an item's expanded state */
  handleToggleItem: (id: string) => void;
  /** Filtered FAQ data based on search */
  filteredFAQData: FAQCategoryData[];
  /** Total number of search results */
  totalResults: number;
  /** Whether there are any results */
  hasResults: boolean;
}

/**
 * Hook for managing FAQ search, filtering, and expand/collapse state.
 *
 * Features:
 * - Deferred search using React 19's useDeferredValue for performance
 * - Expand/collapse state with layout animations
 * - Auto-expand from URL params
 *
 * There is no "popular questions" list any more: it repeated four questions
 * that then appeared again in their own categories directly below it.
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   clearSearch,
 *   expandedItems,
 *   handleToggleItem,
 *   filteredFAQData,
 *   totalResults,
 *   hasResults,
 * } = useFAQSearch({ initialExpandedItem: params.expandItem });
 * ```
 */
export function useFAQSearch({
  initialExpandedItem,
}: UseFAQSearchOptions = {}): UseFAQSearchResult {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(initialExpandedItem ? [initialExpandedItem] : []),
  );
  const [searchQuery, setSearchQuery] = useState('');

  // React 19: useDeferredValue replaces manual debounce - automatically schedules
  // low-priority updates based on device performance
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Auto-expand from URL params if the param changes during the screen's life (e.g. deep-link navigation).
  // Sync external prop into internal expanded-set; required to react to URL param changes mid-screen.
  useEffect(() => {
    if (!initialExpandedItem) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedItems(prev => {
      if (prev.has(initialExpandedItem)) return prev;
      const newSet = new Set(prev);
      newSet.add(initialExpandedItem);
      return newSet;
    });
  }, [initialExpandedItem]);

  const handleToggleItem = useCallback((id: string) => {
    // Animation now handled by Reanimated entering/exiting in the component
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Filter FAQ based on deferred search query for performance
  const filteredFAQData = useMemo(() => {
    if (!deferredSearchQuery.trim()) return FAQ_DATA;

    const query = deferredSearchQuery.toLowerCase().trim();
    return FAQ_DATA.map(category => ({
      ...category,
      items: category.items.filter(
        item =>
          item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query),
      ),
    })).filter(category => category.items.length > 0);
  }, [deferredSearchQuery]);

  const totalResults = useMemo(
    () => filteredFAQData.reduce((sum, category) => sum + category.items.length, 0),
    [filteredFAQData],
  );

  const hasResults = totalResults > 0;

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
    expandedItems,
    handleToggleItem,
    filteredFAQData,
    totalResults,
    hasResults,
  };
}
