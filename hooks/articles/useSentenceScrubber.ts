import type { FlashList } from '@shopify/flash-list';
import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { ViewToken } from 'react-native';

import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

interface UseSentenceScrubberProps {
  sortedSentences: Tables<'article_sentences'>[];
  dueWordRootIds: Set<number>;
  sentenceWordsMap: Map<number, SentenceWord[]>;
}

interface UseSentenceScrubberReturn {
  currentSentenceIndex: number;
  dueWordSentences: Set<number>;
  scrollViewRef: MutableRefObject<FlashList<any> | null>;
  handleViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  handleSentenceChange: (sentenceIndex: number) => void;
  handleScrubStart: () => void;
  handleScrubEnd: () => void;
}

export function useSentenceScrubber({
  sortedSentences,
  dueWordRootIds,
  sentenceWordsMap,
}: UseSentenceScrubberProps): UseSentenceScrubberReturn {
  const scrollViewRef = useRef<FlashList<any> | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const isUserScrubbing = useRef(false);

  // Calculate which sentences contain due words - memoized for performance
  const dueWordSentences = new Set<number>();
  if (sortedSentences && sortedSentences.length > 0) {
    sortedSentences.forEach((sentence, index) => {
      const words = sentenceWordsMap.get(sentence.id);
      if (words?.some(word => word.root_id && dueWordRootIds.has(word.root_id))) {
        dueWordSentences.add(index);
      }
    });
  }

  // Enhanced viewable items changed handler with better tracking
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Don't update scrubber position if user is actively scrubbing
      if (isUserScrubbing.current || viewableItems.length === 0) return;

      // Find all visible sentences (excluding header at index 0)
      const visibleSentences = viewableItems
        .filter(
          item =>
            typeof item.index === 'number' &&
            item.index > 0 && // Skip header
            item.isViewable === true
        )
        .map(item => ({
          index: (item.index as number) - 1, // Convert to sentence index
          item: item,
        }))
        .filter(({ index }) => index >= 0 && index < sortedSentences.length);

      if (visibleSentences.length > 0) {
        // Use the first visible sentence (top of viewport)
        const firstVisibleSentence = visibleSentences[0];
        if (firstVisibleSentence) {
          const newSentenceIndex = firstVisibleSentence.index;

          // Only update if the sentence actually changed to prevent unnecessary re-renders
          if (newSentenceIndex !== currentSentenceIndex) {
            setCurrentSentenceIndex(newSentenceIndex);
          }
        }
      }
    },
    [currentSentenceIndex, sortedSentences.length]
  );

  // Handle sentence change from scrubber
  const handleSentenceChange = useCallback(
    (sentenceIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(sentenceIndex, sortedSentences.length - 1));

      // Update state immediately for responsive scrubber feedback
      setCurrentSentenceIndex(clampedIndex);

      // Scroll to the sentence (FlashList index = sentence index + 1 for header)
      const flashListIndex = clampedIndex + 1;

      if (scrollViewRef.current) {
        try {
          scrollViewRef.current.scrollToIndex({
            index: flashListIndex,
            animated: true,
            viewPosition: 0.1, // Show sentence near top (10% from top for better visibility)
          });
        } catch {
          // Fallback to offset-based scrolling
          const estimatedOffset = clampedIndex * 80; // Better estimate based on typical sentence height
          scrollViewRef.current.scrollToOffset({
            offset: estimatedOffset,
            animated: true,
          });
        }
      }
    },
    [sortedSentences.length]
  );

  // Handle scrub start - mark as user scrubbing to prevent automatic updates
  const handleScrubStart = useCallback(() => {
    isUserScrubbing.current = true;
  }, []);

  // Handle scrub end - allow automatic updates again
  const handleScrubEnd = useCallback(() => {
    // Small delay to prevent immediate position correction when user finishes scrubbing
    setTimeout(() => {
      isUserScrubbing.current = false;
    }, 150);
  }, []);

  return {
    currentSentenceIndex,
    dueWordSentences,
    scrollViewRef,
    handleViewableItemsChanged,
    handleSentenceChange,
    handleScrubStart,
    handleScrubEnd,
  };
}
