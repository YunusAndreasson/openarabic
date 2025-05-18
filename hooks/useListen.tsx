import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { AVPlaybackStatus } from 'expo-av/build/AV.types';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SharedValue } from 'react-native-reanimated';
import { AppState, AppStateStatus } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { StudyWord } from '@/types/vocabulary.types';
import { useOpacityAnimation } from '@/hooks/animations';
import { handleError } from '@/utils/errorHandling';

// Constants for timing
const DELAY_BETWEEN_WORDS = 600; // ms
const DELAY_BETWEEN_LANGUAGES = 1000; // ms
const RECOVERY_CHECK_INTERVAL = 3000; // ms
const STUCK_THRESHOLD = 12000; // ms

// Define audio track interface for the queue system
interface ListenAudioTrack {
  id: string;
  url: string;
  isArabic: boolean;
  wordIndex: number;
}

interface AudioPlayerState {
  sound: Audio.Sound | null;
  tracks: ListenAudioTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  isInitialized: boolean;
}

interface UseListenProps {
  onClose?: () => void;
  /**
   * Flag indicating if the screen was opened from the vocabulary tab
   * Used for proper navigation behavior
   */
  fromVocabulary?: boolean;
}

interface UseListenReturn {
  currentArabicWord: string;
  currentEnglishMeaning: string;
  isArabicActive: boolean;
  isEnglishActive: boolean;
  opacity: SharedValue<number>;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  isComplete: boolean;
  isTransitioning: boolean;
  handleClose: () => void;
  totalWords: number;
  currentWordIndex: number;
}

/**
 * Enhanced audio player for background playback using a queue system
 */
function useAudioPlayer() {
  const audioState = useRef<AudioPlayerState>({
    sound: null,
    tracks: [],
    currentTrackIndex: -1,
    isPlaying: false,
    isInitialized: false,
  });

  // Track app state for background management
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Callbacks for communication with parent component
  const onTrackChangeRef = useRef<(isArabic: boolean, wordIndex: number) => void>(() => {});
  const onCompleteRef = useRef<() => void>(() => {});

  // Initialize the audio session for background playback
  const initAudioSession = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });
      audioState.current.isInitialized = true;
      return true;
    } catch (e) {
      handleError(e instanceof Error ? e : new Error('Failed to initialize audio session'));
      return false;
    }
  }, []);

  // Clean up current audio
  const cleanup = useCallback(async () => {
    const { sound } = audioState.current;
    if (sound) {
      try {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      } catch (e) {
        // Silent cleanup
      }
      audioState.current.sound = null;
    }
    audioState.current.isPlaying = false;
  }, []);

  // Set up the tracks for playback
  const setupTracks = useCallback((words: StudyWord[]) => {
    const tracks: ListenAudioTrack[] = [];

    words.forEach((word, index) => {
      if (word.root?.audio_url) {
        // Add Arabic track
        tracks.push({
          id: `ar-${word.root.id}-${index}`,
          url: word.root.audio_url,
          isArabic: true,
          wordIndex: index,
        });

        // Add delay track (silence)
        if (word.root?.audio_url_en) {
          // Add English track
          tracks.push({
            id: `en-${word.root.id}-${index}`,
            url: word.root.audio_url_en,
            isArabic: false,
            wordIndex: index,
          });
        }
      }
    });

    audioState.current.tracks = tracks;
    audioState.current.currentTrackIndex = -1;
    return tracks.length > 0;
  }, []);

  // Play a specific track from the queue
  const playTrack = useCallback(
    async (index: number): Promise<boolean> => {
      const state = audioState.current;
      const tracks = state.tracks;

      if (index < 0 || index >= tracks.length) {
        return false;
      }

      // Clean up any existing playback
      await cleanup();

      // Update state
      state.currentTrackIndex = index;

      const track = tracks[index];

      // Ensure track exists
      if (!track) {
        return false;
      }

      try {
        // Make sure audio session is initialized
        if (!state.isInitialized) {
          await initAudioSession();
        }

        // Notify parent about track change (for UI updates)
        onTrackChangeRef.current(track.isArabic, track.wordIndex);

        // Create and load the sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.url },
          { shouldPlay: true },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;

            if (status.didJustFinish) {
              // Automatically play the next track when this one finishes
              if (isMountedRef.current) {
                playNextTrack();
              }
            }
          }
        );

        state.sound = sound;
        state.isPlaying = true;

        return true;
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to play track'));
        return false;
      }
    },
    [cleanup, initAudioSession]
  );

  // Play the next track in the queue
  const playNextTrack = useCallback(() => {
    const state = audioState.current;
    const nextIndex = state.currentTrackIndex + 1;

    if (nextIndex >= state.tracks.length) {
      // End of playlist reached
      cleanup();
      onCompleteRef.current();
      return false;
    }

    const currentTrack =
      state.currentTrackIndex >= 0 ? state.tracks[state.currentTrackIndex] : null;
    const nextTrack = state.tracks[nextIndex];

    // Ensure nextTrack exists before using it
    if (!nextTrack) {
      return false;
    }

    // Add delay between words if we're transitioning from English to Arabic
    if (currentTrack && !currentTrack.isArabic && nextTrack.isArabic) {
      setTimeout(() => {
        if (isMountedRef.current) {
          playTrack(nextIndex);
        }
      }, DELAY_BETWEEN_WORDS);
    }
    // Add delay between languages (Arabic to English)
    else if (currentTrack && currentTrack.isArabic && !nextTrack.isArabic) {
      setTimeout(() => {
        if (isMountedRef.current) {
          playTrack(nextIndex);
        }
      }, DELAY_BETWEEN_LANGUAGES);
    }
    // No delay needed
    else {
      playTrack(nextIndex);
    }

    return true;
  }, [playTrack, cleanup]);

  // Start playback from the beginning or a specific index
  const startPlayback = useCallback(
    (startIndex = 0) => {
      if (audioState.current.tracks.length === 0) {
        return false;
      }

      return playTrack(startIndex);
    },
    [playTrack]
  );

  // Register callback handlers
  const registerCallbacks = useCallback(
    (onTrackChange: (isArabic: boolean, wordIndex: number) => void, onComplete: () => void) => {
      onTrackChangeRef.current = onTrackChange;
      onCompleteRef.current = onComplete;
    },
    []
  );

  // Handle app state changes
  useEffect(() => {
    // Initialize audio session on mount
    initAudioSession();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') ||
        (appStateRef.current === 'active' && nextAppState.match(/inactive|background/))
      ) {
        // Reinitialize audio session when app state changes to maintain background playback
        initAudioSession();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      cleanup().catch(() => {});
    };
  }, [cleanup, initAudioSession]);

  return {
    setupTracks,
    startPlayback,
    cleanup,
    registerCallbacks,
  };
}

export function useListen({ onClose, fromVocabulary }: UseListenProps = {}): UseListenReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioPlayer = useAudioPlayer();

  // State
  const [wordList, setWordList] = useState<StudyWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isArabicActive, setIsArabicActive] = useState(true);
  const [isEnglishActive, setIsEnglishActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);

  // Refs
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxProgressRef = useRef(0);
  const lastProgressUpdateRef = useRef(Date.now());

  // Animation
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({
    initialOpacity: 1,
    duration: 300,
  });

  // Fetch words data
  const { allWords } = useFSRSQueries({
    userId: user?.id,
  });

  // Handle track change (update UI state)
  const handleTrackChange = useCallback(
    (isArabic: boolean, wordIndex: number) => {
      setIsArabicActive(isArabic);
      setIsEnglishActive(!isArabic);

      // Only update word index if it's different (and fade if needed)
      if (wordIndex !== currentWordIndex) {
        fadeOut();

        // Update timestamp for progress tracking
        lastProgressUpdateRef.current = Date.now();

        setTimeout(() => {
          setCurrentWordIndex(wordIndex);

          // Calculate and update progress
          if (wordList.length > 0) {
            const newProgress = Math.floor((wordIndex / wordList.length) * 100);
            if (newProgress > maxProgressRef.current) {
              maxProgressRef.current = newProgress;
              setProgressAnimationKey(p => p + 1);
            }
          }

          fadeIn();
        }, 300);
      }
    },
    [currentWordIndex, fadeIn, fadeOut, wordList.length]
  );

  // Handle playback completion
  const handleComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  // Register callbacks when component mounts
  useEffect(() => {
    audioPlayer.registerCallbacks(handleTrackChange, handleComplete);
  }, [audioPlayer, handleTrackChange, handleComplete]);

  // Initialize word list when data is available
  useEffect(() => {
    // Only run this effect if we have words and our list is empty
    if (!allWords?.length || wordList.length > 0) {
      return;
    }

    // Filter words with both audio_url and audio_url_en
    const wordsWithAudio = allWords.filter(word => word.root?.audio_url && word.root?.audio_url_en);

    // Shuffle the array to randomize the order
    const shuffled = [...wordsWithAudio].sort(() => 0.5 - Math.random());

    // Take first 20 words or less
    const selectedWords = shuffled.slice(0, 20);

    // Initialize state
    setWordList(selectedWords);

    // Reset progress tracking
    lastProgressUpdateRef.current = Date.now();

    // Reset other state to initial values
    maxProgressRef.current = 0;
    setCurrentWordIndex(0);

    // Set up audio tracks
    if (selectedWords.length > 0) {
      audioPlayer.setupTracks(selectedWords);
    }
  }, [allWords, wordList.length, audioPlayer]);

  // Start playback when word list is initialized
  useEffect(() => {
    if (wordList.length > 0 && !isComplete) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Flag to prevent running the effect during cleanup
      let isMounted = true;

      // Start playback after a short delay
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          audioPlayer.startPlayback(0);
        }
      }, 500);

      return () => {
        isMounted = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [wordList.length, isComplete, audioPlayer]);

  // Current word properties
  const currentWord = wordList[currentWordIndex] || null;
  const currentArabicWord = currentWord?.root?.letters || '';
  const currentEnglishMeaning = currentWord?.root?.meaning || '';

  // Calculate progress
  const progress = wordList.length > 0 ? Math.floor((currentWordIndex / wordList.length) * 100) : 0;

  // Use a memoized value for maxProgress
  const maxProgress = maxProgressRef.current;

  // Recovery mechanism to prevent getting stuck
  useEffect(() => {
    // Skip effect if no current word or already complete
    if (!currentWord || isComplete) return;

    const recoveryTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastProgress = now - lastProgressUpdateRef.current;

      // If we've been on the same word for too long, force moving to the next word
      if (timeSinceLastProgress > STUCK_THRESHOLD) {
        // Force cleanup and restart from next word
        audioPlayer.cleanup();

        // Update timestamp
        lastProgressUpdateRef.current = Date.now();

        // Move to next word if possible
        if (currentWordIndex < wordList.length - 1) {
          // Find the next track to play
          const nextWordIndex = currentWordIndex + 1;
          audioPlayer.startPlayback(nextWordIndex * 2); // Each word has 2 tracks (Arabic + English)
        } else {
          // If this was the last word, complete the session
          setIsComplete(true);
        }
      }
    }, RECOVERY_CHECK_INTERVAL);

    return () => clearInterval(recoveryTimer);
  }, [currentWord, isComplete, audioPlayer, currentWordIndex, wordList.length]);

  // Close and cleanup
  const handleClose = useCallback(() => {
    // Prevent multiple clicks
    const wasAlreadyComplete = isComplete;

    // Ensure audio is stopped and cleanup is done
    audioPlayer.cleanup();

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
            if (onClose) {
              onClose();
            } else {
              // Use the most direct approach for completed sessions - forcefully go back
              router.back();
            }
          } else {
            // For user-initiated cancellations during session, use the original logic
            if (onClose) {
              onClose();
            } else if (fromVocabulary) {
              // Use replace instead of navigate to avoid navigation stack issues
              router.replace('/(tabs)/vocabulary');
            } else {
              router.back();
            }
          }
        } catch (error) {
          // Fallback - if navigation fails, forcefully go back
          console.error('Navigation error:', error);
          router.back();
        }
      },
      wasAlreadyComplete ? 100 : 300
    ); // Faster timeout for completed sessions
  }, [user?.id, queryClient, onClose, audioPlayer, isComplete, fromVocabulary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing audio
      audioPlayer.cleanup();

      // Clear any timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset state refs
      maxProgressRef.current = 0;
    };
  }, [audioPlayer]);

  return {
    currentArabicWord,
    currentEnglishMeaning,
    isArabicActive,
    isEnglishActive,
    opacity,
    progress,
    maxProgress,
    progressAnimationKey,
    isComplete,
    isTransitioning,
    handleClose,
    totalWords: wordList.length,
    currentWordIndex,
  };
}
