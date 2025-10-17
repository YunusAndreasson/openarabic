import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewToken } from 'react-native';

import type { FlashListRef } from '@shopify/flash-list';
import { LAYOUT } from '@/constants/layout';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

interface UseSentenceScrubberProps {
  sortedSentences: Tables<'article_sentences'>[];
  sentenceWordsMap: Map<number, SentenceWord[]>;
  lastSentenceRead?: number; // Optional: last sentence read for progress calculation
  headerOffset?: number; // Optional: top padding (e.g., parallax header height)
}

interface UseSentenceScrubberReturn {
  currentSentenceIndex: number;
  dueWordSentences: Set<number>;
  scrollViewRef: MutableRefObject<FlashListRef<Tables<'article_sentences'>> | null>;
  handleViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  handleSentenceChange: (sentenceIndex: number) => void;
  handleScrubStart: () => void;
  handleScrubEnd: () => void;
  jumpToLastReadPosition: () => void;
}

export function useSentenceScrubber({
  sortedSentences,
  sentenceWordsMap,
  lastSentenceRead = 0,
  headerOffset = 0,
}: UseSentenceScrubberProps): UseSentenceScrubberReturn {
  const scrollViewRef = useRef<FlashListRef<Tables<'article_sentences'>> | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const isUserScrubbing = useRef(false);
  const lastSentenceReadRef = useRef(lastSentenceRead);
  const isJumpingToLastPosition = useRef(false);
  const isJumpingRef = useRef(false); // New flag to prevent progress saving during jumps

  // Update ref when lastSentenceRead changes and handle resume logic
  useEffect(() => {
    lastSentenceReadRef.current = lastSentenceRead;
  }, [lastSentenceRead]);

  // Calculate progress percentage and determine if we should allow jumping to last position
  const progressPercentage = useMemo(() => {
    const percentage =
      sortedSentences.length > 0 ? (lastSentenceReadRef.current / sortedSentences.length) * 100 : 0;
    return percentage;
  }, [sortedSentences.length, lastSentenceReadRef.current]);

  const shouldAllowJumpToLastPosition = useMemo(() => {
    return progressPercentage >= 15;
  }, [progressPercentage]);

  // Calculate which sentences contain study words - memoized for performance
  const dueWordSentences = new Set<number>();
  if (sortedSentences && sortedSentences.length > 0) {
    sortedSentences.forEach((sentence, index) => {
      const words = sentenceWordsMap.get(sentence.id);
      if (words?.some(word => word.root_id)) {
        dueWordSentences.add(index);
      }
    });
  }

  // Enhanced viewable items changed handler with better tracking
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Don't update scrubber position if user is actively scrubbing or jumping to last position
      if (isUserScrubbing.current || isJumpingToLastPosition.current || viewableItems.length === 0)
        return;

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
        // Sort by index to ensure we pick the topmost visible sentence
        visibleSentences.sort((a, b) => a.index - b.index);

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

      // Scroll to the sentence - use scrollToIndex for all cases
      if (scrollViewRef.current) {
        const flashListIndex = clampedIndex + 1; // +1 for header

        try {
          scrollViewRef.current.scrollToIndex({
            index: flashListIndex,
            animated: true,
            // Use viewPosition 0 for edges to ensure visibility without scrolling past
            viewPosition:
              clampedIndex === 0 || clampedIndex === sortedSentences.length - 1 ? 0 : 0.1,
          });
        } catch {
          // Fallback to offset-based scrolling
          const estimatedOffset = headerOffset + clampedIndex * LAYOUT.SENTENCE_ITEM.HEIGHT;
          scrollViewRef.current.scrollToOffset({
            offset: estimatedOffset,
            animated: true,
          });
        }
      }
    },
    [sortedSentences.length, headerOffset]
  );

  // Function to safely jump to last read position (respects 15% threshold)
  const jumpToLastReadPosition = useCallback(() => {
    if (
      !shouldAllowJumpToLastPosition ||
      lastSentenceReadRef.current <= 0 ||
      !scrollViewRef.current
    ) {
      return;
    }

    // Set flags to prevent handleViewableItemsChanged and progress saving from interfering
    isJumpingToLastPosition.current = true;
    isJumpingRef.current = true;

    const targetIndex = lastSentenceReadRef.current;
    const flashListIndex = targetIndex + 1; // +1 for header

    try {
      scrollViewRef.current.scrollToIndex({
        index: flashListIndex,
        animated: true,
        // Use viewPosition 0 for edges to ensure visibility without scrolling past
        viewPosition: targetIndex === 0 || targetIndex === sortedSentences.length - 1 ? 0 : 0.1,
      });
      setCurrentSentenceIndex(targetIndex);
    } catch {
      // Fallback to offset-based scrolling
      const estimatedOffset = headerOffset + targetIndex * LAYOUT.SENTENCE_ITEM.HEIGHT;
      scrollViewRef.current.scrollToOffset({
        offset: estimatedOffset,
        animated: true,
      });
      setCurrentSentenceIndex(targetIndex);
    }

    // Clear the flags after a delay to allow the scroll animation to complete
    setTimeout(() => {
      isJumpingToLastPosition.current = false;
      isJumpingRef.current = false;
    }, 2000); // 2 second delay to ensure scroll animation completes and viewable items settle
  }, [shouldAllowJumpToLastPosition, headerOffset]);

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
    jumpToLastReadPosition,
  };
}
