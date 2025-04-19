import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/build/Audio.types';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useFSRS } from '@/hooks/useFSRS';
import { useWordSizing } from '@/hooks/useWordSizing';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

// Add debug tag for filtering logs
const DEBUG_TAG = '[AudioDebug]';

// Create a standalone audio player outside of React component lifecycle
// This prevents cleanup due to re-renders
const standaloneAudioPlayer: {
  sound: Audio.Sound | null;
  lastUrl: string | null;
  isPlaying: boolean;
  playAudio: (url: string) => Promise<void>;
  cleanup: () => Promise<void>;
} = {
  sound: null,
  lastUrl: null,
  isPlaying: false,

  playAudio: async (url: string) => {
    try {
      // Don't replay the same audio in quick succession
      if (standaloneAudioPlayer.lastUrl === url && standaloneAudioPlayer.isPlaying) {
        console.log(`${DEBUG_TAG} Already playing this audio URL, skipping`);
        return;
      }

      // Clean up previous sound
      await standaloneAudioPlayer.cleanup();

      console.log(`${DEBUG_TAG} Standalone player loading: ${url}`);
      standaloneAudioPlayer.lastUrl = url;
      standaloneAudioPlayer.isPlaying = true;

      // Configure audio session
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      // Load and play
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        status => {
          if (!status.isLoaded) return;

          // Handle completion
          if (status.didJustFinish) {
            console.log(`${DEBUG_TAG} Standalone player: playback finished`);
            standaloneAudioPlayer.isPlaying = false;
          }
        }
      );

      standaloneAudioPlayer.sound = sound;
      console.log(`${DEBUG_TAG} Standalone player: playback started`);

      // Safety timeout to release resources after playback
      setTimeout(() => {
        if (standaloneAudioPlayer.lastUrl === url) {
          standaloneAudioPlayer.isPlaying = false;
        }
      }, 3000);
    } catch (error) {
      console.error(`${DEBUG_TAG} Standalone player error:`, error);
      standaloneAudioPlayer.isPlaying = false;
    }
  },

  cleanup: async () => {
    if (standaloneAudioPlayer.sound) {
      try {
        await standaloneAudioPlayer.sound.stopAsync().catch(() => {});
        await standaloneAudioPlayer.sound.unloadAsync().catch(() => {});
      } catch (e) {
        // Ignore errors
      }
      standaloneAudioPlayer.sound = null;
    }
    standaloneAudioPlayer.isPlaying = false;
  },
};

interface UseReviewProps {
  fromVocabulary?: boolean;
  onClose?: () => void;
}

interface UseReviewReturn {
  // States
  showMeaningOverlay: boolean;
  currentMeaning: string;
  currentSentence: { wordForm: string };
  isTransitioningToCompletion: boolean;
  showInitialLoading: boolean;
  opacity: SharedValue<number>;
  isComplete: boolean;
  isLoading: boolean;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  wordFontSize: number;

  // Handlers
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handleClose: () => void;
}

export function useReview({
  fromVocabulary = false,
  onClose,
}: UseReviewProps = {}): UseReviewReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Animation and audio state
  const { opacity, fadeIn, fadeOut } = useOpacityAnimation({ initialOpacity: 1 });
  const { loadAndPlayAudio, stopPlayback } = useAudioPlayer();
  const nextWordAudioRef = useRef<{ url: string; loaded: boolean; sound?: Audio.Sound } | null>(
    null
  );

  // UI state
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [currentMeaning, setCurrentMeaning] = useState('');
  const [currentSentence, setCurrentSentence] = useState({ wordForm: '' });
  const [isTransitioningToCompletion, setIsTransitioningToCompletion] = useState(false);
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [showInitialLoading, setShowInitialLoading] = useState(fromVocabulary);

  // Refs for state management
  const meaningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxProgressRef = useRef(0);
  const completionTriggeredRef = useRef(false);
  const isUpdatingWordRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef(Date.now());
  const lastProcessedWordIdRef = useRef<string | null>(null);

  // Define completion transition function
  const triggerCompletionTransition = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    // Stop standard audio player
    stopPlayback();
    // Also stop standalone player
    standaloneAudioPlayer.cleanup();

    maxProgressRef.current = 100;
    setProgressAnimationKey(prev => prev + 1);
    setIsTransitioningToCompletion(true);
    fadeOut();

    if (completionTransitionRef.current) {
      clearTimeout(completionTransitionRef.current);
    }

    completionTransitionRef.current = setTimeout(() => {
      if (completionTriggeredRef.current) {
        setIsTransitioningToCompletion(false);
        stopPlayback();
      }
    }, 350);
  }, [fadeOut, stopPlayback]);

  // Initialize FSRS hook
  const { currentWord, wordQueue, isLoading, isComplete, progress, updateWord, invalidateQueries } =
    useFSRS({
      userId: user?.id,
      onComplete: triggerCompletionTransition,
    });

  // Calculate dynamic font size for Arabic words based on window width
  const dynamicFontConfig = {
    minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6, // For very small screens
    maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3, // Fixed font size for most words
    minScreenWidth: 320, // iPhone SE width
    maxScreenWidth: 500, // Tablet width threshold
  };

  // Use our custom hook for word sizing with simplified approach
  const wordFontSize = useWordSizing(currentWord?.root?.letters, dynamicFontConfig);

  // Preload audio function
  const preloadNextAudio = useCallback(async (audioUrl: string) => {
    if (!audioUrl) return;

    console.log(`${DEBUG_TAG} Preloading audio: ${audioUrl}`);
    try {
      if (nextWordAudioRef.current?.url === audioUrl && nextWordAudioRef.current.loaded) {
        console.log(`${DEBUG_TAG} Audio already preloaded: ${audioUrl}`);
        return; // Already loaded this audio
      }

      // Clean up previous preloaded audio if it exists
      if (nextWordAudioRef.current?.sound) {
        console.log(`${DEBUG_TAG} Unloading previous preloaded audio`);
        await nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
      }

      // Create and load the sound but don't play it
      console.log(`${DEBUG_TAG} Creating preloaded sound`);
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });

      nextWordAudioRef.current = {
        url: audioUrl,
        loaded: true,
        sound,
      };
      console.log(`${DEBUG_TAG} Successfully preloaded audio: ${audioUrl}`);
    } catch (error) {
      console.error(
        `${DEBUG_TAG} Error preloading audio: ${error instanceof Error ? error.message : String(error)}`
      );
      handleError(error instanceof Error ? error : String(error));
      nextWordAudioRef.current = {
        url: audioUrl,
        loaded: false,
      };
    }
  }, []);

  // Hide initial loading after delay
  useEffect(() => {
    if (showInitialLoading) {
      const mounted = { current: true };
      const timer = setTimeout(() => {
        if (mounted.current) {
          setShowInitialLoading(false);
        }
      }, 300);

      return () => {
        mounted.current = false;
        clearTimeout(timer);
      };
    }
    return () => {}; // Empty cleanup function for when showInitialLoading is false
  }, [showInitialLoading]);

  // Handle completion state
  useEffect(() => {
    if (isComplete && !isTransitioningToCompletion && !completionTriggeredRef.current) {
      triggerCompletionTransition();
    }

    if (isComplete) {
      stopPlayback();
      standaloneAudioPlayer.cleanup();
    }
  }, [isComplete, isTransitioningToCompletion, triggerCompletionTransition, stopPlayback]);

  // Update progress tracking
  useEffect(() => {
    if (!isLoading && progress !== undefined) {
      const now = Date.now();
      if (now - lastProgressUpdateRef.current < 100) {
        return;
      }

      const safeProgress = Math.min(100, Math.max(0, progress));
      if (safeProgress > maxProgressRef.current) {
        maxProgressRef.current = safeProgress;
        setProgressAnimationKey(prev => prev + 1);
        lastProgressUpdateRef.current = now;
      }
    }
  }, [isLoading, progress, isComplete]);

  // Update current sentence and handle audio
  useEffect(() => {
    if (completionTriggeredRef.current || isComplete || isTransitioningToCompletion) {
      console.log(`${DEBUG_TAG} Skipping audio playback due to completion state`);
      return;
    }

    if (currentWord?.root && !isComplete && !isTransitioningToCompletion) {
      const wordId = String(currentWord.root_id || 'unknown');
      const wordForm = currentWord.root.letters;
      const audioUrl = currentWord.root.audio_url;

      console.log(
        `${DEBUG_TAG} Processing word: ID=${wordId}, word="${wordForm}", length=${wordForm.length} chars`
      );
      console.log(`${DEBUG_TAG} Audio URL from root: ${audioUrl || 'None'}`);

      // Check if we've already processed this word to prevent repeated processing
      if (lastProcessedWordIdRef.current === wordId && currentSentence.wordForm === wordForm) {
        console.log(`${DEBUG_TAG} Skipping duplicate processing of word ID=${wordId}`);
        return;
      }

      // Update tracking of processed word
      lastProcessedWordIdRef.current = wordId;
      setCurrentSentence({ wordForm });

      // Use preloaded audio if available, otherwise load and play
      if (audioUrl) {
        console.log(`${DEBUG_TAG} Attempting to play audio URL: ${audioUrl}`);

        // Use the standalone player instead of the React hook-based player
        standaloneAudioPlayer.playAudio(audioUrl).catch(error => {
          console.error(`${DEBUG_TAG} Error playing audio: ${error}`);
        });
      } else {
        console.log(`${DEBUG_TAG} No audio URL available for word: ${wordForm}`);
      }

      // Preload next word's audio after a delay
      setTimeout(() => {
        const nextWord = wordQueue[0];
        if (nextWord?.root?.audio_url) {
          console.log(`${DEBUG_TAG} Preloading next word audio: ${nextWord.root.audio_url}`);
          preloadNextAudio(nextWord.root.audio_url);
        }
      }, 300);
    } else if (!currentWord?.root) {
      console.log(`${DEBUG_TAG} No current word available`);
    }
  }, [
    currentWord?.root_id,
    isComplete,
    isTransitioningToCompletion,
    loadAndPlayAudio,
    wordQueue,
    preloadNextAudio,
  ]);

  // Handle swipe left (don't know)
  const handleSwipeLeft = useCallback(() => {
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      return;
    }

    console.log(`${DEBUG_TAG} Handle swipe left - stopping playback for word transition`);
    isUpdatingWordRef.current = true;
    // Add a small delay before stopping playback to allow very short audio to complete
    setTimeout(() => {
      stopPlayback();
      // Also stop standalone player
      standaloneAudioPlayer.cleanup();
      fadeOut();

      setTimeout(() => {
        const meaning = currentWord?.root?.meaning || 'No translation available';
        setCurrentMeaning(meaning);
        setShowMeaningOverlay(true);

        meaningTimeoutRef.current = setTimeout(() => {
          setShowMeaningOverlay(false);

          if (currentWord?.root_id) {
            console.log(`${DEBUG_TAG} Updating word after swipe left, ID=${currentWord.root_id}`);
            updateWord(currentWord.root_id, false)
              .then(() => {
                if (!isUpdatingWordRef.current) return;
                setTimeout(() => {
                  console.log(`${DEBUG_TAG} Fading in after swipe left`);
                  fadeIn();
                }, 150);
              })
              .catch(error => {
                console.error(`${DEBUG_TAG} Error updating word:`, error);
                if (!isUpdatingWordRef.current) return;
                console.log(`${DEBUG_TAG} Fading in after swipe left error`);
                fadeIn();
              })
              .finally(() => {
                console.log(`${DEBUG_TAG} Word update complete, resetting flags`);
                isUpdatingWordRef.current = false;
                if (meaningTimeoutRef.current) {
                  clearTimeout(meaningTimeoutRef.current);
                  meaningTimeoutRef.current = null;
                }
              });
          } else {
            console.log(`${DEBUG_TAG} No word ID, just fading in after swipe left`);
            fadeIn();
            isUpdatingWordRef.current = false;
          }
        }, 2000);
      }, 300);
    }, 200); // Short delay to allow audio to begin playing
  }, [
    currentWord,
    updateWord,
    isTransitioningToCompletion,
    isComplete,
    fadeIn,
    fadeOut,
    stopPlayback,
  ]);

  // Handle swipe right (know)
  const handleSwipeRight = useCallback(() => {
    if (
      isUpdatingWordRef.current ||
      isTransitioningToCompletion ||
      isComplete ||
      completionTriggeredRef.current
    ) {
      return;
    }

    console.log(`${DEBUG_TAG} Handle swipe right - stopping playback for word transition`);
    isUpdatingWordRef.current = true;
    // Add a small delay before stopping playback to allow very short audio to complete
    setTimeout(() => {
      stopPlayback();
      // Also stop standalone player
      standaloneAudioPlayer.cleanup();
      fadeOut();

      setTimeout(() => {
        if (currentWord?.root_id) {
          console.log(`${DEBUG_TAG} Updating word after swipe right, ID=${currentWord.root_id}`);
          updateWord(currentWord.root_id, true)
            .then(() => {
              if (!isUpdatingWordRef.current) return;
              setTimeout(() => {
                console.log(`${DEBUG_TAG} Fading in after swipe right`);
                fadeIn();
              }, 150);
            })
            .catch(error => {
              console.error(`${DEBUG_TAG} Error updating word:`, error);
              if (!isUpdatingWordRef.current) return;
              console.log(`${DEBUG_TAG} Fading in after swipe right error`);
              fadeIn();
            })
            .finally(() => {
              console.log(`${DEBUG_TAG} Word update complete, resetting flags`);
              isUpdatingWordRef.current = false;
            });
        } else {
          console.log(`${DEBUG_TAG} No word ID, just fading in after swipe right`);
          fadeIn();
          isUpdatingWordRef.current = false;
        }
      }, 300);
    }, 200); // Short delay to allow audio to begin playing
  }, [
    currentWord,
    updateWord,
    isTransitioningToCompletion,
    isComplete,
    fadeIn,
    fadeOut,
    stopPlayback,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    const mounted = { current: true };
    lightFeedback();

    // Stop both players
    stopPlayback()
      .then(() => {
        standaloneAudioPlayer.cleanup();

        if (!mounted.current) return;

        invalidateQueries();

        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
          queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
          queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });
          queryClient.removeQueries({ queryKey: ['dueWords', user.id] });
          queryClient.removeQueries({ queryKey: ['studyWords', user.id] });
          queryClient.removeQueries({ queryKey: ['vocabularyStats'] });
        }

        setTimeout(() => {
          if (mounted.current) {
            if (onClose) {
              onClose();
            } else {
              router.back();
            }
          }
        }, 100);
      })
      .catch(error => {
        handleError(error);
        if (mounted.current) {
          if (onClose) {
            onClose();
          } else {
            router.back();
          }
        }
      });

    return () => {
      mounted.current = false;
    };
  }, [invalidateQueries, user?.id, queryClient, stopPlayback, onClose]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      console.log(`${DEBUG_TAG} Cleanup effect running`);
      completionTriggeredRef.current = true;
      fadeIn();

      stopPlayback().catch(error => {
        console.error(`${DEBUG_TAG} Error stopping playback during cleanup:`, error);
        handleError(error);
      });

      // Clean up standalone player
      standaloneAudioPlayer.cleanup();

      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
        meaningTimeoutRef.current = null;
      }

      if (completionTransitionRef.current) {
        clearTimeout(completionTransitionRef.current);
        completionTransitionRef.current = null;
      }

      // Clean up any preloaded audio
      if (nextWordAudioRef.current?.sound) {
        console.log(`${DEBUG_TAG} Unloading preloaded sound during cleanup`);
        nextWordAudioRef.current.sound.unloadAsync().catch(() => {});
      }

      isUpdatingWordRef.current = false;
      maxProgressRef.current = 0;
      nextWordAudioRef.current = null;
      lastProcessedWordIdRef.current = null;
    };
  }, [fadeIn, stopPlayback]);

  return {
    // States
    showMeaningOverlay,
    currentMeaning,
    currentSentence,
    isTransitioningToCompletion,
    showInitialLoading,
    opacity,
    isComplete,
    isLoading,
    progress,
    maxProgress: maxProgressRef.current,
    progressAnimationKey,
    wordFontSize,

    // Handlers
    handleSwipeLeft,
    handleSwipeRight,
    handleClose,
  };
}
