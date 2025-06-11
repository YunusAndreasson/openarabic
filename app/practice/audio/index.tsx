import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import type { JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ListenHeader, CompletionScreen } from '@/components/listen';
import RepeatButton from '@/components/listen/RepeatButton';
import { WordDisplay } from '@/components/review';
import { AUDIO_STATES } from '@/constants/audio';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useWordSizing } from '@/hooks/vocabulary/useWordSizing';
import { listenAudioService } from '@/services/listenAudioService';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

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
  const fromRemember = params.fromRemember === 'true';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // State
  const [isComplete, setIsComplete] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [wordList, setWordList] = useState<StudyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  // Refs
  const maxProgressRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedTracksRef = useRef<EnhancedAudioTrack[]>([]);
  const lastAudioStateRef = useRef<string>(AUDIO_STATES.IDLE);
  const playbackCompletedRef = useRef(false);
  const hasStartedPlayback = useRef(false);

  // Animation
  const { animatedStyle, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 200,
    autoStart: true,
  });

  // Get enhanced audio player
  const audioPlayer = useAudioPlayer();
  const { audioState, currentTrackIndex, actions } = audioPlayer;

  // Keep actions ref updated
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Fetch vocabulary words
  const { allWords } = useFSRSQueries({
    userId: user?.id,
  });

  const wordMap = useMemo(() => {
    const map = new Map<number, StudyWord>();
    allWords?.forEach(word => {
      if (word.root?.id) {
        map.set(word.root.id, word);
      }
    });
    return map;
  }, [allWords]);

  // Handle repeat toggle
  const handleRepeatToggle = useCallback(() => {
    const newValue = !repeatEnabled;
    setRepeatEnabled(newValue);
  }, [repeatEnabled]);

  // Function to handle track changes and update UI
  const handleTrackChange = useCallback(() => {
    if (currentTrackIndex < 0) return;

    // Extract audio track information from the currentTrackIndex
    // We can determine if it's Arabic or English by looking at even/odd indices
    // Even indices are Arabic tracks, odd indices are English tracks
    const wordIndex = Math.floor(currentTrackIndex / 2); // Each word has 2 tracks (AR+EN)

    // Update current word if needed (only when moving to a different word)
    if (wordIndex !== currentWordIndex && wordIndex >= 0) {
      fadeOut();

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
      }, 200); // Reduced timeout for smoother transitions
    }
  }, [currentTrackIndex, fadeIn, fadeOut, currentWordIndex, wordList.length]);

  // Handle track changes
  useEffect(() => {
    handleTrackChange();
  }, [currentTrackIndex, handleTrackChange]);

  // Track audio state changes for completion
  useEffect(() => {
    if (audioState !== lastAudioStateRef.current) {
      lastAudioStateRef.current = audioState;

      // When audio finishes or stops, mark practice as completed
      if (audioState === AUDIO_STATES.IDLE && hasStartedPlayback.current) {
        setIsComplete(true);
      }
    }
  }, [audioState]);

  // Initialize word list and start playback
  useEffect(() => {
    // Only run this effect if we have words and our list is empty
    if (!allWords?.length || wordList.length > 0) {
      return;
    }

    // Async function to handle track loading
    const loadTracksAndStartPlayback = async () => {
      try {
        // Get random vocabulary tracks (await the promise)
        const selectedTracks = await listenAudioService.getRandomVocabularyTracks(allWords, 20);
        selectedTracksRef.current = selectedTracks;

        // Initialize word list state
        if (selectedTracks.length > 0) {
          const seenIds = new Set<number>();
          const uniqueWords: StudyWord[] = [];

          selectedTracks.forEach(track => {
            const wordId = track.rootId ?? 0;
            if (!seenIds.has(wordId)) {
              const word = wordMap.get(wordId);
              if (word) {
                seenIds.add(wordId);
                uniqueWords.push(word);
              }
            }
          });

          setWordList(uniqueWords);

          // Reset progress tracking
          maxProgressRef.current = 0;
          setCurrentWordIndex(0);
          lastAudioStateRef.current = 'idle';
          playbackCompletedRef.current = false;

          // Start playback with a small delay
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            actionsRef.current.startEnhancedPlayback(selectedTracks, 0).catch(error => {
              handleError(
                error instanceof Error ? error : new Error('Failed to start audio playback')
              );
            });
          }, 500);
        }
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to load vocabulary tracks'));
      }
    };

    // Call the async function
    loadTracksAndStartPlayback();
  }, [allWords, wordList.length]);

  // Function to restart playback for repeat mode
  const handleRestartPlayback = useCallback(() => {
    // Skip if there are no tracks to play
    if (selectedTracksRef.current.length === 0) {
      return;
    }

    // Set a small delay to restart playback
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsComplete(false);
      setCurrentWordIndex(0);
      maxProgressRef.current = 0;
      setProgressAnimationKey(prev => prev + 1);
      playbackCompletedRef.current = false;

      actionsRef.current.startEnhancedPlayback(selectedTracksRef.current, 0).catch(error => {
        handleError(error instanceof Error ? error : new Error('Failed to restart audio playback'));
      });
    }, 500);
  }, []);

  // Handle completion when last track ends
  useEffect(() => {
    // Check if playback has completed
    if (playbackCompletedRef.current && audioState === 'idle' && wordList.length > 0) {
      if (repeatEnabled && selectedTracksRef.current.length > 0) {
        // If repeat is enabled, restart playback
        handleRestartPlayback();
      } else {
        // Otherwise, show completion screen
        setIsComplete(true);
      }

      // Reset the flag
      playbackCompletedRef.current = false;
    }
  }, [audioState, repeatEnabled, handleRestartPlayback, wordList.length]);

  // Close and cleanup
  const handleClose = useCallback(() => {
    // Set the closing flag to prevent showing the completion screen
    setIsClosing(true);

    // Ensure audio is stopped and cleanup is done
    actionsRef.current.stopPlayback().catch(() => {});

    // Clear any timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Invalidate relevant queries
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
    }

    // For non-completion scenarios, navigate away immediately
    try {
      // For user-initiated cancellations during session
      if (fromRemember) {
        // Use replace instead of navigate to avoid navigation stack issues
        router.replace('/(tabs)/practice');
      } else {
        router.back();
      }
    } catch (error) {
      // Fallback - if navigation fails, forcefully go back
      handleError(error instanceof Error ? error : new Error(String(error)));
      router.back();
    }
  }, [user?.id, queryClient, fromRemember, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing audio
      actionsRef.current.stopPlayback().catch(() => {});

      // Clear any timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset state refs
      maxProgressRef.current = 0;
      playbackCompletedRef.current = false;
    };
  }, []); // Empty dependencies - only run on mount/unmount

  // Current word properties
  const currentWord = wordList[currentWordIndex] || null;
  const currentArabicWord = currentWord?.root?.letters || '';
  const currentEnglishMeaning = currentWord?.root?.meaning || '';

  // Determine if we should show English translation based on current track
  // Even indices (0, 2, 4...) are Arabic tracks, odd indices (1, 3, 5...) are English tracks
  const isEnglishTrack = currentTrackIndex >= 0 && currentTrackIndex % 2 === 1;
  const translationToShow = isEnglishTrack ? currentEnglishMeaning : undefined;

  // Calculate progress
  const progress =
    wordList.length > 0 ? Math.floor(((currentWordIndex + 1) / wordList.length) * 100) : 0;

  // Use a memoized value for maxProgress
  const maxProgress = maxProgressRef.current;

  // Calculate font size based on word length
  const wordFontSize = useWordSizing(currentArabicWord, fontConfig);

  // Only show completion screen if we're not in the process of closing
  if (isComplete && !isClosing) {
    return (
      <CompletionScreen
        useThemedView
        buttonStyle={{ minWidth: 180 }}
        buttonText="Continue"
        buttonVariant="outlined"
        iconName="checkmark-circle-outline"
        iconSize={120}
        subtitle="All words practiced"
        title="Session Complete!"
        onClose={handleClose}
      />
    );
  }

  return (
    <ThemedView style={styles.container} useSafeArea={true}>
      <View style={styles.contentContainer}>
        <ListenHeader
          animationKey={progressAnimationKey}
          maxProgress={maxProgress}
          progress={progress}
          onClose={handleClose}
        />

        <View style={styles.wordArea}>
          <Animated.View style={[styles.wordContainer, animatedStyle as any]}>
            <WordDisplay
              fontSize={wordFontSize}
              translation={translationToShow}
              word={currentArabicWord}
            />
          </Animated.View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + LAYOUT.SPACING.SMALL }]}>
          <RepeatButton enabled={repeatEnabled} onToggle={handleRepeatToggle} />

          <View style={styles.noteContainer}>
            <Ionicons
              color={colors.tint}
              name="information-circle-outline"
              size={18}
              style={styles.noteIcon}
            />
            <ThemedText style={styles.noteText}>Works with screen off</ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 0,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  noteContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    opacity: LAYOUT.OPACITY.HOVER,
  },
  noteIcon: {
    fontWeight: '500',
    marginRight: LAYOUT.SPACING.TINY,
    opacity: LAYOUT.OPACITY.HOVER,
  },
  noteText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.HOVER,
  },
  wordArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
    position: 'relative',
    width: '100%',
  },
  wordContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
