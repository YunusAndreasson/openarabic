import { useMemo } from 'react';

import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

interface UseCurrentSentenceParams {
  /** Current audio position in seconds */
  position: number;
  /** Sorted sentences from the article */
  sentences: Tables<'article_sentences'>[];
  /** Map of sentence words with timing data */
  sentenceWordsMap: Map<number, SentenceWord[]>;
}

interface CurrentSentenceData {
  /** Current sentence being played */
  currentSentence: Tables<'article_sentences'> | null;
  /** Index of the current sentence */
  currentSentenceIndex: number;
  /** Progress within the current sentence (0-1) */
  sentenceProgress: number;
  /** Current word being spoken within the sentence */
  currentWord: SentenceWord | null;
}

/**
 * Hook to calculate which sentence and word is currently being played
 * based on audio position and timing data from sentence_words
 */
export const useCurrentSentence = ({
  position,
  sentences,
  sentenceWordsMap,
}: UseCurrentSentenceParams): CurrentSentenceData => {
  return useMemo(() => {
    // Default state
    const defaultState: CurrentSentenceData = {
      currentSentence: null,
      currentSentenceIndex: -1,
      sentenceProgress: 0,
      currentWord: null,
    };

    // Early return if no sentences or invalid position
    if (!sentences.length || position < 0) {
      return defaultState;
    }

    // Calculate cumulative timing for each sentence
    let cumulativeTime = 0;
    const sentenceTimings: {
      sentence: Tables<'article_sentences'>;
      startTime: number;
      endTime: number;
      index: number;
    }[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;
      const words = sentenceWordsMap.get(sentence.id) || [];

      // Calculate sentence duration from word timings
      let sentenceDuration = 0;
      if (words.length > 0) {
        // Find min start and max end times
        const wordTimes = words
          .filter(word => word.audio_start && word.audio_end)
          .map(word => ({
            start: parseFloat(word.audio_start ?? '0'),
            end: parseFloat(word.audio_end ?? '0'),
          }))
          .filter(time => !isNaN(time.start) && !isNaN(time.end));

        if (wordTimes.length > 0) {
          const minStart = Math.min(...wordTimes.map(t => t.start));
          const maxEnd = Math.max(...wordTimes.map(t => t.end));
          sentenceDuration = maxEnd - minStart;
        }
      }

      // Fallback duration if no timing data (estimate 3 seconds per sentence)
      if (sentenceDuration <= 0) {
        sentenceDuration = 3.0;
      }

      sentenceTimings.push({
        sentence,
        startTime: cumulativeTime,
        endTime: cumulativeTime + sentenceDuration,
        index: i,
      });

      cumulativeTime += sentenceDuration;
    }

    // Find current sentence based on position
    const currentTiming = sentenceTimings.find(
      timing => position >= timing.startTime && position < timing.endTime
    );

    if (!currentTiming) {
      // If position is beyond all sentences, return the last sentence
      const lastTiming = sentenceTimings[sentenceTimings.length - 1];
      if (lastTiming && lastTiming.sentence && position >= lastTiming.endTime) {
        return {
          currentSentence: lastTiming.sentence,
          currentSentenceIndex: lastTiming.index,
          sentenceProgress: 1,
          currentWord: null,
        };
      }
      return defaultState;
    }

    // Calculate progress within current sentence
    const sentenceDuration = currentTiming.endTime - currentTiming.startTime;
    const positionInSentence = position - currentTiming.startTime;
    const sentenceProgress = sentenceDuration > 0 ? positionInSentence / sentenceDuration : 0;

    // Find current word within the sentence
    const sentenceWords = sentenceWordsMap.get(currentTiming.sentence.id) || [];
    let currentWord: SentenceWord | null = null;

    if (sentenceWords.length > 0) {
      // Convert sentence-relative position to absolute position for word matching
      const absolutePositionInSentence = positionInSentence;

      currentWord =
        sentenceWords.find(word => {
          if (!word.audio_start || !word.audio_end) return false;

          const startTime = parseFloat(word.audio_start);
          const endTime = parseFloat(word.audio_end);

          if (isNaN(startTime) || isNaN(endTime)) return false;

          return absolutePositionInSentence >= startTime && absolutePositionInSentence < endTime;
        }) || null;
    }

    return {
      currentSentence: currentTiming.sentence,
      currentSentenceIndex: currentTiming.index,
      sentenceProgress: Math.max(0, Math.min(1, sentenceProgress)),
      currentWord,
    };
  }, [position, sentences, sentenceWordsMap]);
};
