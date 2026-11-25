import { useEffect, useState } from 'react';

import { DICTIONARY_QUERY_MAX_LENGTH, dictionarySearchTerm } from '@/utils/dictionarySearch';

const SEARCH_DELAY_MS = 250;

export function useDictionarySearch(initialQuery: string) {
  const [input, setInput] = useState(() => initialQuery.slice(0, DICTIONARY_QUERY_MAX_LENGTH));
  const [debounced, setDebounced] = useState(() => dictionarySearchTerm(initialQuery));
  const normalized = dictionarySearchTerm(input);

  useEffect(() => {
    if (!normalized) return;
    const timer = setTimeout(() => setDebounced(normalized), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [normalized]);

  return {
    input,
    setInput: (value: string) => setInput(value.slice(0, DICTIONARY_QUERY_MAX_LENGTH)),
    term: normalized === debounced ? debounced : '',
    isDebouncing: !!normalized && normalized !== debounced,
  };
}
