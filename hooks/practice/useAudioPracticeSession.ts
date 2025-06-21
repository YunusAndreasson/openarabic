import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { STRINGS } from '@/constants/strings';
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

  const startPlayback = useCallback(
    (
      tracks: EnhancedAudioTrack[],
      errorMessage: string = STRINGS.FAILED_TO_START_AUDIO_PLAYBACK
    ) => {
      maxProgressRef.current = 0;
      setCurrentWordIndex(0);
      playbackCompletedRef.current = false;
      hasStartedPlayback.current = false;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        actionsRef.current.startEnhancedPlayback(tracks, 0).catch(error => {
          handleError(error instanceof Error ? error : new Error(errorMessage));
        });
      }, 100);
    },
    []
  );

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

          lastAudioStateRef.current = AUDIO_STATES.IDLE;
          startPlayback(selectedTracks, STRINGS.FAILED_TO_START_AUDIO_PLAYBACK);
        }
      } catch (error) {
        handleError(
          error instanceof Error ? error : new Error(STRINGS.FAILED_TO_LOAD_VOCABULARY_TRACKS)
        );
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

    setIsComplete(false);
    setProgressAnimationKey(prev => prev + 1);
    isInitialized.current = false; // Reset initialization flag to allow restart

    startPlayback(selectedTracksRef.current, STRINGS.FAILED_TO_RESTART_AUDIO_PLAYBACK);
  }, [startPlayback]);

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
      actionsRef.current?.stopPlayback?.()?.catch(() => {});

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
