import { useState, useCallback, useEffect } from 'react';
import { useAudio, AudioOptions } from './useAudio';

export interface PlaylistItem {
  /**
   * URL of the audio file
   */
  audioUrl: string;

  /**
   * Unique identifier for the item
   */
  id: string | number;

  /**
   * Any additional data associated with the item
   */
  data?: any;
}

export interface PlaylistOptions extends Omit<AudioOptions, 'loopAudio'> {
  /**
   * Whether to loop the entire playlist
   * @default false
   */
  loopPlaylist?: boolean;

  /**
   * Whether to shuffle the playlist
   * @default false
   */
  shuffle?: boolean;

  /**
   * Callback when the playlist ends
   */
  onPlaylistEnd?: () => void;

  /**
   * Callback when an item starts playing
   */
  onItemStart?: (item: PlaylistItem, index: number) => void;

  /**
   * Callback when an item finishes playing
   */
  onItemFinish?: (item: PlaylistItem, index: number) => void;
}

/**
 * A hook for managing a playlist of audio files
 *
 * @param items Array of playlist items
 * @param options Configuration options for the playlist
 * @returns An object with playlist control functions and status
 */
export function usePlaylist(items: PlaylistItem[] = [], options: PlaylistOptions = {}) {
  // Extract options with defaults
  const {
    loopPlaylist = false,
    shuffle = false,
    onPlaylistEnd,
    onItemStart,
    onItemFinish,
    ...audioOptions
  } = options;

  // State
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>(items);
  const [shuffledItems, setShuffledItems] = useState<PlaylistItem[]>([]);
  const [isShuffleMode, setIsShuffleMode] = useState<boolean>(shuffle);

  // Get the current item
  const currentItem = (isShuffleMode ? shuffledItems : playlistItems)[currentIndex];
  const currentAudioUrl = currentItem?.audioUrl || null;

  // Custom callback for when audio playback finishes
  const handlePlaybackFinish = useCallback(() => {
    // Call the item finish callback if provided
    if (onItemFinish && currentIndex >= 0 && currentItem) {
      onItemFinish(currentItem, currentIndex);
    }

    // Determine if we should play the next item
    const itemList = isShuffleMode ? shuffledItems : playlistItems;
    if (currentIndex < itemList.length - 1) {
      // Play the next item
      setCurrentIndex(currentIndex + 1);
    } else if (loopPlaylist && itemList.length > 0) {
      // Loop back to the beginning
      setCurrentIndex(0);
    } else {
      // End of playlist
      setCurrentIndex(-1);
      if (onPlaylistEnd) {
        onPlaylistEnd();
      }
    }
  }, [
    currentIndex,
    currentItem,
    isShuffleMode,
    shuffledItems,
    playlistItems,
    loopPlaylist,
    onItemFinish,
    onPlaylistEnd,
  ]);

  // Custom callback for when audio playback starts
  const handlePlaybackStart = useCallback(() => {
    if (onItemStart && currentIndex >= 0 && currentItem) {
      onItemStart(currentItem, currentIndex);
    }
  }, [currentIndex, currentItem, onItemStart]);

  // Use our audio hook
  const audio = useAudio(currentAudioUrl, {
    ...audioOptions,
    onPlaybackFinish: handlePlaybackFinish,
    onPlaybackStart: handlePlaybackStart,
  });

  // Shuffle the playlist
  const shufflePlaylist = useCallback(() => {
    if (playlistItems.length <= 1) return;

    // Create a copy of the items and shuffle them
    const shuffled = [...playlistItems].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
    setIsShuffleMode(true);

    // If currently playing, start the shuffled playlist from the beginning
    if (audio.isPlaying) {
      setCurrentIndex(0);
    }
  }, [playlistItems, audio.isPlaying]);

  // Toggle shuffle mode
  const toggleShuffle = useCallback(() => {
    if (isShuffleMode) {
      // Turn off shuffle mode
      setIsShuffleMode(false);

      // If currently playing, find the current item in the original list
      if (currentItem && audio.isPlaying) {
        const newIndex = playlistItems.findIndex(item => item.id === currentItem.id);
        if (newIndex >= 0) {
          setCurrentIndex(newIndex);
        }
      }
    } else {
      // Turn on shuffle mode
      shufflePlaylist();
    }
  }, [isShuffleMode, shufflePlaylist, currentItem, audio.isPlaying, playlistItems]);

  // Play a specific item by index
  const playItemAt = useCallback(
    async (index: number) => {
      if (index >= 0 && index < (isShuffleMode ? shuffledItems : playlistItems).length) {
        setCurrentIndex(index);
        if (!audio.isPlaying) {
          // Wait for the next render cycle when currentAudioUrl is updated
          setTimeout(() => {
            audio.play();
          }, 0);
        }
      }
    },
    [isShuffleMode, shuffledItems, playlistItems, audio]
  );

  // Play a specific item by id
  const playItemById = useCallback(
    async (id: string | number) => {
      const items = isShuffleMode ? shuffledItems : playlistItems;
      const index = items.findIndex(item => item.id === id);
      if (index >= 0) {
        await playItemAt(index);
      }
    },
    [isShuffleMode, shuffledItems, playlistItems, playItemAt]
  );

  // Play the next item
  const playNext = useCallback(async () => {
    const items = isShuffleMode ? shuffledItems : playlistItems;
    if (items.length === 0) return;

    if (currentIndex < items.length - 1) {
      await playItemAt(currentIndex + 1);
    } else if (loopPlaylist) {
      await playItemAt(0);
    }
  }, [currentIndex, isShuffleMode, shuffledItems, playlistItems, loopPlaylist, playItemAt]);

  // Play the previous item
  const playPrevious = useCallback(async () => {
    const items = isShuffleMode ? shuffledItems : playlistItems;
    if (items.length === 0) return;

    // If we're more than 3 seconds into the current track, restart it
    if (audio.position > 3000) {
      audio.seekTo(0);
      return;
    }

    if (currentIndex > 0) {
      await playItemAt(currentIndex - 1);
    } else if (loopPlaylist) {
      await playItemAt(items.length - 1);
    }
  }, [currentIndex, isShuffleMode, shuffledItems, playlistItems, loopPlaylist, playItemAt, audio]);

  // Start playing the playlist

  // Stop the playlist

  // Update items when the prop changes
  useEffect(() => {
    setPlaylistItems(items);

    // If shuffle mode is on, re-shuffle the new items
    if (isShuffleMode) {
      setShuffledItems([...items].sort(() => Math.random() - 0.5));
    }

    // Reset current index if it's out of bounds
    if (currentIndex >= items.length) {
      setCurrentIndex(-1);
    }
  }, [items, isShuffleMode, currentIndex]);

  // Initialize shuffle mode from options
  useEffect(() => {
    if (shuffle && !isShuffleMode && playlistItems.length > 1) {
      shufflePlaylist();
    }
  }, [shuffle, isShuffleMode, playlistItems, shufflePlaylist]);

  return {
    // Playlist controls
    playNext,
    playPrevious,
    playItemAt,
    playItemById,
    toggleShuffle,
    shufflePlaylist,

    // Playlist status
    currentIndex,
    currentItem,
    isShuffleMode,

    // Audio controls and status (forwarded from useAudio)
    ...audio,

    // Playlist data
    items: isShuffleMode ? shuffledItems : playlistItems,
    originalItems: playlistItems,
    shuffledItems,
  };
}
