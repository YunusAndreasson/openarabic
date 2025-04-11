import { useState, useRef, useEffect, useCallback } from 'react';

import type { EnhancedAudioTrack } from '@/services/enhancedAudioService';

import { AUDIO_STATES, useAudioPlayer } from './useAudioPlayer';
import type { AudioTrack } from './useAudioPlayer';

/**
 * Type for metadata about the current playback session
 */
interface PlaybackMetadata {
  articleId: number;
  articleTitle: string;
  currentTrackType: 'study_word_english' | 'study_word_arabic' | 'sentence' | null;
  currentWordId: number | null;
  currentSentenceId: number | null;
  currentSentencePosition: number | null;
}

/**
 * Hook for enhanced audio player that handles study words and sentence-level audio
 */
export function useEnhancedAudioPlayer() {
  // Use the base audio player
  const audioPlayer = useAudioPlayer();

  // Additional state for enhanced audio player
  const [metadata, setMetadata] = useState<PlaybackMetadata>({
    articleId: 0,
    articleTitle: '',
    currentTrackType: null,
    currentWordId: null,
    currentSentenceId: null,
    currentSentencePosition: null,
  });

  // Ref to hold the current playlist for easier access
  const currentPlaylistRef = useRef<EnhancedAudioTrack[]>([]);

  // Convert enhanced tracks to format usable by base player
  const convertToBaseTracks = useCallback((enhancedTracks: EnhancedAudioTrack[]): AudioTrack[] => {
    return enhancedTracks.map(track => {
      // Safely extract ID from the composite ID string
      const idParts = track.id.split('-');
      // Ensure index exists before using it
      const numericId = idParts.length > 2 && idParts[2] ? parseInt(idParts[2], 10) : 0;

      return {
        id: numericId || 0, // Ensure we have a valid number
        audioUrl: track.audioUrl,
        title: track.title,
      };
    });
  }, []);

  // Update metadata based on current track
  const updateMetadata = useCallback((track: EnhancedAudioTrack | null) => {
    if (!track) {
      setMetadata({
        articleId: 0,
        articleTitle: '',
        currentTrackType: null,
        currentWordId: null,
        currentSentenceId: null,
        currentSentencePosition: null,
      });
      return;
    }

    // Extract base title without type, handle potentially undefined split result
    const titleParts = track.title.split(' (');
    // Ensure we always have a string for the title
    const baseTitle = titleParts.length > 0 && titleParts[0] ? titleParts[0] : '';

    setMetadata({
      articleId: track.articleId,
      articleTitle: baseTitle,
      currentTrackType: track.type,
      currentWordId: track.wordId || null,
      currentSentenceId: track.sentenceId || null,
      currentSentencePosition: track.sentencePosition || null,
    });
  }, []);

  // Start playback with enhanced tracks
  const startEnhancedPlayback = useCallback(
    async (tracks: EnhancedAudioTrack[], startIndex = 0) => {
      if (!tracks || tracks.length === 0) return false;

      // Store the enhanced tracks for reference
      currentPlaylistRef.current = tracks;

      // Convert to base tracks for the audio player
      const baseTracks = convertToBaseTracks(tracks);

      // Start playback using base player
      const success = await audioPlayer.startPlayback(baseTracks, startIndex);

      // Update metadata for the current track
      if (success && tracks[startIndex]) {
        updateMetadata(tracks[startIndex]);
      }

      return success;
    },
    [audioPlayer, convertToBaseTracks, updateMetadata]
  );

  // Start shuffle playback with enhanced tracks
  const startEnhancedShufflePlayback = useCallback(
    async (tracks: EnhancedAudioTrack[]) => {
      if (!tracks || tracks.length === 0) return false;

      // Store the enhanced tracks for reference
      // Note: the actual order will be determined by the base player
      currentPlaylistRef.current = tracks;

      // Convert to base tracks for the audio player
      const baseTracks = convertToBaseTracks(tracks);

      // Start shuffle playback using base player
      const success = await audioPlayer.startShufflePlayback(baseTracks);

      // Update metadata for the current track
      // We need to get the current track index from the base player
      if (success && audioPlayer.currentTrackIndex >= 0) {
        const currentEnhancedTrack = tracks[audioPlayer.currentTrackIndex];
        if (currentEnhancedTrack) {
          updateMetadata(currentEnhancedTrack);
        }
      }

      return success;
    },
    [audioPlayer, convertToBaseTracks, updateMetadata]
  );

  // Update metadata when current track changes
  useEffect(() => {
    const { currentTrackIndex, audioState } = audioPlayer;

    // Only update metadata if player is active and we have a valid index
    if (
      audioState !== AUDIO_STATES.IDLE &&
      currentTrackIndex >= 0 &&
      currentPlaylistRef.current.length > 0 &&
      currentTrackIndex < currentPlaylistRef.current.length
    ) {
      const currentTrack = currentPlaylistRef.current[currentTrackIndex];
      if (currentTrack) {
        updateMetadata(currentTrack);
      }
    } else if (audioState === AUDIO_STATES.IDLE) {
      // Reset metadata when player is idle
      updateMetadata(null);
    }
  }, [audioPlayer.currentTrackIndex, audioPlayer.audioState, updateMetadata]);

  // Return combined API
  return {
    ...audioPlayer, // Include all base audio player functionality
    startEnhancedPlayback,
    startEnhancedShufflePlayback,
    metadata,

    // Helper functions to identify track types
    isStudyWordTrack: useCallback(
      () =>
        metadata.currentTrackType === 'study_word_english' ||
        metadata.currentTrackType === 'study_word_arabic',
      [metadata.currentTrackType]
    ),

    isSentenceTrack: useCallback(
      () => metadata.currentTrackType === 'sentence',
      [metadata.currentTrackType]
    ),

    // Get study words count for an article
    getStudyWordsCount: useCallback((articleId: number) => {
      return (
        currentPlaylistRef.current.filter(
          track =>
            track.articleId === articleId &&
            (track.type === 'study_word_english' || track.type === 'study_word_arabic')
        ).length / 2
      ); // Divide by 2 because each word has both English and Arabic
    }, []),
  };
}
