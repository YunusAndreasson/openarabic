import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { listenAudioService } from '@/services/listenAudioService';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

interface UseAudioPracticeSessionReturn {
  currentArabicWord: string;
  currentWord: StudyWord | null;
  translationToShow?: string;
  progress: number;
  maxProgress: number;
  progressAnimationKey: number;
  repeatEnabled: boolean;
  isComplete: boolean;
  handleRepeatToggle: () => void;
  stopPlayback: () => Promise<void>;
}

export function useAudioPracticeSession(): UseAudioPracticeSessionReturn {
  const { user } = useAuth();

  // State
  const [isComplete, setIsComplete] = useState(false);
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialized = useRef(false);

  // Enhanced audio player
  const audioPlayer = useAudioPlayer();
  const { audioState, currentTrackIndex, actions } = audioPlayer;

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Fetch vocabulary words
  const { allWords } = useFSRSQueries({ userId: user?.id });

  const wordMap = useMemo(() => {
    const map = new Map<number, StudyWord>();
    allWords?.forEach(word => {
      if (word.root?.id) {
        map.set(word.root.id, word);
      }
    });
    return map;
  }, [allWords]);

  const handleRepeatToggle = useCallback(() => {
    setRepeatEnabled(prev => !prev);
  }, []);

  const handleTrackChange = useCallback(() => {
    if (currentTrackIndex < 0) return;

    const wordIndex = Math.floor(currentTrackIndex / 2);

    if (wordIndex !== currentWordIndex && wordIndex >= 0) {
      setCurrentWordIndex(wordIndex);

      if (wordList.length > 0) {
        const newProgress = Math.floor(((wordIndex + 1) / wordList.length) * 100);
        if (newProgress > maxProgressRef.current) {
          maxProgressRef.current = newProgress;
          setProgressAnimationKey(p => p + 1);
        }
      }
    }

    if (currentTrackIndex === selectedTracksRef.current.length - 1) {
      playbackCompletedRef.current = true;
    }
  }, [currentTrackIndex, currentWordIndex, wordList.length]);

  useEffect(() => {
    handleTrackChange();
  }, [currentTrackIndex, handleTrackChange]);

  useEffect(() => {
    if (audioState !== lastAudioStateRef.current) {
      lastAudioStateRef.current = audioState;

      // Track when playback actually starts
      if (audioState === AUDIO_STATES.PLAYING) {
        hasStartedPlayback.current = true;
      }

      if (audioState === AUDIO_STATES.IDLE && hasStartedPlayback.current) {
        setIsComplete(true);
      }
    }
  }, [audioState]);

  // Load tracks and start playback when words are available
  useEffect(() => {
    if (!user || !allWords || allWords.length === 0 || isComplete || isInitialized.current) {
      return;
    }

    isInitialized.current = true; // Mark as initialized

    // Create abort controller for this session
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadTracksAndStartPlayback = async () => {
      try {
        const selectedTracks = await listenAudioService.getRandomVocabularyTracks(
          allWords,
          20,
          controller.signal
        );

        selectedTracksRef.current = selectedTracks;

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

          maxProgressRef.current = 0;
          setCurrentWordIndex(0);
          lastAudioStateRef.current = AUDIO_STATES.IDLE;
          playbackCompletedRef.current = false;
          hasStartedPlayback.current = false;

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            actionsRef.current.startEnhancedPlayback(selectedTracks, 0).catch(error => {
              handleError(
                error instanceof Error ? error : new Error('Failed to start audio playback')
              );
            });
          }, 100);
        }
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to load vocabulary tracks'));
      }
    };

    loadTracksAndStartPlayback();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      controller.abort();
      isInitialized.current = false; // Reset initialization flag
    };
  }, [user, allWords, isComplete]);

  const handleRestartPlayback = useCallback(() => {
    if (selectedTracksRef.current.length === 0) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsComplete(false);
      setCurrentWordIndex(0);
      maxProgressRef.current = 0;
      setProgressAnimationKey(prev => prev + 1);
      playbackCompletedRef.current = false;
      hasStartedPlayback.current = false;
      isInitialized.current = false; // Reset initialization flag to allow restart

      actionsRef.current.startEnhancedPlayback(selectedTracksRef.current, 0).catch(error => {
        handleError(error instanceof Error ? error : new Error('Failed to restart audio playback'));
      });
    }, 100);
  }, []);

  useEffect(() => {
    if (playbackCompletedRef.current && audioState === AUDIO_STATES.IDLE && wordList.length > 0) {
      if (repeatEnabled && selectedTracksRef.current.length > 0) {
        handleRestartPlayback();
      } else {
        setIsComplete(true);
      }

      playbackCompletedRef.current = false;
    }
  }, [audioState, repeatEnabled, handleRestartPlayback, wordList.length]);

  useEffect(() => {
    return () => {
      actionsRef.current.stopPlayback().catch(() => {});

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      maxProgressRef.current = 0;
      playbackCompletedRef.current = false;
    };
  }, []);

  const currentWord = wordList[currentWordIndex] || null;
  const currentArabicWord = currentWord?.root?.letters || '';
  const currentEnglishMeaning = currentWord?.root?.meaning || '';

  const isEnglishTrack = currentTrackIndex >= 0 && currentTrackIndex % 2 === 1;
  const translationToShow = isEnglishTrack ? currentEnglishMeaning : undefined;

  const progress =
    wordList.length > 0 ? Math.floor(((currentWordIndex + 1) / wordList.length) * 100) : 0;
  const maxProgress = maxProgressRef.current;

  return {
    currentArabicWord,
    currentWord,
    translationToShow,
    progress,
    maxProgress,
    progressAnimationKey,
    repeatEnabled,
    isComplete,
    handleRepeatToggle,
    stopPlayback: actionsRef.current.stopPlayback,
  };
}
