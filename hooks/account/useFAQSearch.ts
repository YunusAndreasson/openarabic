import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation } from 'react-native';

import { getFAQExpandAnimation } from '@/constants/animation';
import { FAQ_DATA, type FAQCategoryData, type FAQItem } from '@/constants/faq';

/** IDs of popular questions to show at the top */
const POPULAR_QUESTION_IDS = [
  'what-is-app',
  'arabic-text-coloring',
  'spaced-repetition',
  'learning-speed',
] as const;

/** Debounce delay for search input (ms) */
const SEARCH_DEBOUNCE_MS = 150;

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
  /** Whether to show popular questions (when not searching) */
  showPopularQuestions: boolean;
  /** Popular questions for quick access */
  popularQuestions: FAQItem[];
}

/**
 * Helper: Generate unique key for FAQ items.
 * Popular questions use prefix to avoid conflicts with category duplicates.
 */
export const getFAQItemKey = (itemId: string, prefix?: string): string =>
  prefix ? `${prefix}-${itemId}` : itemId;

/**
 * Hook for managing FAQ search, filtering, and expand/collapse state.
 *
 * Features:
 * - Debounced search for performance
 * - Expand/collapse state with layout animations
 * - Popular questions extraction
 * - Auto-expand from URL params
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
 *   showPopularQuestions,
 *   popularQuestions,
 * } = useFAQSearch({ initialExpandedItem: params.expandItem });
 * ```
 */
export function useFAQSearch({
  initialExpandedItem,
}: UseFAQSearchOptions = {}): UseFAQSearchResult {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Auto-expand item from URL params
  useEffect(() => {
    if (!initialExpandedItem) return;

    setExpandedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(initialExpandedItem);
      return newSet;
    });
  }, [initialExpandedItem]);

  // Debounce search query for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleItem = useCallback((id: string) => {
    // Use spring-based LayoutAnimation for natural expand/collapse feel
    const animationConfig = getFAQExpandAnimation();
    if (
      animationConfig &&
      LayoutAnimation &&
      typeof LayoutAnimation.configureNext === 'function'
    ) {
      LayoutAnimation.configureNext(animationConfig);
    }

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

  // Filter FAQ based on debounced search query for performance
  const filteredFAQData = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return FAQ_DATA;

    const query = debouncedSearchQuery.toLowerCase().trim();
    return FAQ_DATA.map(category => ({
      ...category,
      items: category.items.filter(
        item =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query),
      ),
    })).filter(category => category.items.length > 0);
  }, [debouncedSearchQuery]);

  const totalResults = useMemo(
    () => filteredFAQData.reduce((sum, category) => sum + category.items.length, 0),
    [filteredFAQData],
  );

  const hasResults = totalResults > 0;

  // Get popular questions for quick access
  const popularQuestions = useMemo(() => {
    const allQuestions = FAQ_DATA.flatMap(category => category.items);
    return POPULAR_QUESTION_IDS.map(id => allQuestions.find(q => q.id === id)).filter(
      Boolean,
    ) as FAQItem[];
  }, []);

  // Only show popular questions when not searching
  const showPopularQuestions = !debouncedSearchQuery.trim();

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
    expandedItems,
    handleToggleItem,
    filteredFAQData,
    totalResults,
    hasResults,
    showPopularQuestions,
    popularQuestions,
  };
}
