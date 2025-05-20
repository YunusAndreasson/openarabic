import React, { JSX, useCallback, useEffect, useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { ListenHeader, CompletionScreen } from '@/components/listen';
import { WordDisplay } from '@/components/review';
import { useColors } from '@/hooks/useColors';
import { useWordSizing } from '@/hooks/useWordSizing';
import { useAuth } from '@/hooks/useAuth';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useEnhancedAudioPlayer } from '@/hooks/useEnhancedAudioPlayer';
import { useOpacityAnimation } from '@/hooks/animations';
import { listenAudioService } from '@/services/listenAudioService';
import { useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/utils/errorHandling';
import { StudyWord } from '@/types/vocabulary.types';

/**
 * Screen that plays Arabic words followed by their English translations
 * with visual indication of which language is currently being spoken
 */
const fontConfig = {
  minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
  maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
  minScreenWidth: 320,
  maxScreenWidth: 500,
};

export default function ListenScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromVocabulary = params.fromVocabulary === 'true';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const colors = useColors();

  // State
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wordList, setWordList] = useState<StudyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isArabicActive, setIsArabicActive] = useState(true);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);

  // Refs
  const maxProgressRef = useRef(0);
  const lastProgressUpdateRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation
  const { fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: 300,
  });

  // Get enhanced audio player
  const enhancedAudioPlayer = useEnhancedAudioPlayer();
  const { audioState, currentTrackIndex, actions } = enhancedAudioPlayer;

  // Fetch vocabulary words
  const { allWords } = useFSRSQueries({
    userId: user?.id,
  });

  // Function to handle track changes and update UI
  const handleTrackChange = useCallback(() => {
    if (currentTrackIndex < 0) return;

    // Extract audio track information from the currentTrackIndex
    // We can determine if it's Arabic or English by looking at even/odd indices
    // Even indices are Arabic tracks, odd indices are English tracks
    const isArabic = currentTrackIndex % 2 === 0;
    const wordIndex = Math.floor(currentTrackIndex / 2); // Each word has 2 tracks (AR+EN)

    setIsArabicActive(isArabic);

    // Update current word if needed
    if (wordIndex !== currentWordIndex && wordIndex >= 0) {
      fadeOut();

      // Update timestamp for progress tracking
      lastProgressUpdateRef.current = Date.now();

      setTimeout(() => {
        setCurrentWordIndex(wordIndex);

        // Calculate and update progress
        if (wordList.length > 0) {
          const newProgress = Math.floor(((wordIndex + 1) / wordList.length) * 100);
          if (newProgress > maxProgressRef.current) {
            maxProgressRef.current = newProgress;
            setProgressAnimationKey(p => p + 1);
          }
        }

        fadeIn();
      }, 300);
    }
  }, [currentTrackIndex, fadeIn, fadeOut, currentWordIndex, wordList.length]);

  // Handle track changes
  useEffect(() => {
    handleTrackChange();
  }, [currentTrackIndex, handleTrackChange]);

  // Initialize word list and start playback
  useEffect(() => {
    // Only run this effect if we have words and our list is empty
    if (!allWords?.length || wordList.length > 0) {
      return;
    }

    // Get random vocabulary tracks
    const selectedTracks = listenAudioService.getRandomVocabularyTracks(allWords, 20);

    // Keep the original study words for reference
    const wordMap = new Map<number, StudyWord>();
    allWords.forEach(word => {
      if (word.root?.id) {
        wordMap.set(word.root.id, word);
      }
    });

    // Initialize word list state
    if (selectedTracks.length > 0) {
      // Get unique words (not tracks)
      const uniqueWordIds = new Set<number>();
      const uniqueWords: StudyWord[] = [];

      // Extract wordIds from tracks
      selectedTracks.forEach(track => {
        const wordId = track.articleId; // We're using articleId to store rootId
        if (!uniqueWordIds.has(wordId)) {
          const word = wordMap.get(wordId);
          if (word) {
            uniqueWordIds.add(wordId);
            uniqueWords.push(word);
          }
        }
      });

      setWordList(uniqueWords);

      // Reset progress tracking
      lastProgressUpdateRef.current = Date.now();
      maxProgressRef.current = 0;
      setCurrentWordIndex(0);

      // Start playback with a small delay
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        actions.startEnhancedPlayback(selectedTracks, 0).catch(error => {
          handleError(error instanceof Error ? error : new Error('Failed to start audio playback'));
        });
      }, 500);
    }
  }, [allWords, wordList.length, actions]);

  // Handle completion when last track ends
  useEffect(() => {
    // Check if we've played all tracks
    if (audioState === 'idle' && currentTrackIndex >= 0 && wordList.length > 0) {
      // We were playing but now we're idle, which means playback completed
      setIsComplete(true);
    }
  }, [audioState, currentTrackIndex, wordList.length]);

  // Close and cleanup
  const handleClose = useCallback(() => {
    // Prevent multiple clicks
    const wasAlreadyComplete = isComplete;

    // Ensure audio is stopped and cleanup is done
    actions.stopPlayback().catch(() => {});

    // Clear any timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Invalidate relevant queries
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
    }

    // Use a delay to ensure cleanup completes
    setTimeout(
      () => {
        try {
          // If was called via a button after session completion, use the most direct approach
          if (wasAlreadyComplete) {
            router.back();
          } else {
            // For user-initiated cancellations during session
            if (fromVocabulary) {
              // Use replace instead of navigate to avoid navigation stack issues
              router.replace('/(tabs)/vocabulary');
            } else {
              router.back();
            }
          }
        } catch (error) {
          // Fallback - if navigation fails, forcefully go back
          handleError(error instanceof Error ? error : new Error(String(error)));
          router.back();
        }
      },
      wasAlreadyComplete ? 100 : 300
    ); // Faster timeout for completed sessions
  }, [user?.id, queryClient, actions, isComplete, fromVocabulary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing audio
      actions.stopPlayback().catch(() => {});

      // Clear any timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset state refs
      maxProgressRef.current = 0;
    };
  }, [actions]);

  // Current word properties
  const currentWord = wordList[currentWordIndex] || null;
  const currentArabicWord = currentWord?.root?.letters || '';
  const currentEnglishMeaning = currentWord?.root?.meaning || '';

  // Calculate progress
  const progress =
    wordList.length > 0 ? Math.floor(((currentWordIndex + 1) / wordList.length) * 100) : 0;

  // Use a memoized value for maxProgress
  const maxProgress = maxProgressRef.current;

  // Calculate font size based on word length
  const wordFontSize = useWordSizing(currentArabicWord, fontConfig);

  if (isComplete || isTransitioning) {
    return (
      <CompletionScreen
        onClose={handleClose}
        title="Listening Complete!"
        subtitle="You've listened to all the vocabulary words in this session."
        buttonText="Close"
        buttonVariant="outlined"
        iconName="checkmark-circle-outline"
        iconSize={120}
        useThemedView
        buttonStyle={{ minWidth: 180 }}
      />
    );
  }

  return (
    <ThemedView style={styles.container} useSafeArea={true}>
      <View style={styles.contentContainer}>
        <ListenHeader
          progress={progress}
          maxProgress={maxProgress}
          animationKey={progressAnimationKey}
          onClose={handleClose}
        />

        <View style={styles.wordArea}>
          <WordDisplay
            word={currentArabicWord}
            translation={currentEnglishMeaning}
            fontSize={wordFontSize}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.noteContainer}>
            <Ionicons
              name="headset-outline"
              size={16}
              color={colors.tabIconDefault}
              style={styles.noteIcon}
            />
            <ThemedText style={styles.noteText}>Audio continues with screen off</ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  wordArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
  },
  footer: {
    width: '100%',
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIcon: {
    marginRight: LAYOUT.SPACING.TINY,
    opacity: 0.8,
    fontWeight: '500',
  },
  noteText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: 0.8,
    fontWeight: '500',
  },
});
