import type { AudioStatus } from '@/services/audioPlayer';

/**
 * Pure readings of the audio service's status for ARTICLE audio, kept out of
 * `useShouldShowMiniPlayer` so the app-root audio state can share them without
 * importing a hook module (which the jest setup replaces wholesale).
 *
 * Review prompts, word previews and practice clips intentionally omit
 * `articleId` from their tracks, so none of these ever describe one of them.
 */

/**
 * Whether an article track is loaded: playing, buffering, or paused.
 *
 * Paused counts. This used to require `playing`, so any pause the app did not
 * make — the lock screen, a headphone button, a phone call — hid the mini
 * player with the track still loaded, and nothing on screen could bring it
 * back. A stop clears the track and the end of the queue stops, so both still
 * read false; `ended` covers a single track that finished outside a queue.
 */
export function isArticleAudioActive(status: AudioStatus): boolean {
  return status.currentTrack?.articleId !== undefined && status.playbackState !== 'ended';
}

/**
 * An article track that is loaded and holding still: paused by the listener,
 * the lock screen, a headphone button or the OS. Not while it is still
 * buffering, which is a play that has not started sounding yet.
 */
export function isArticleAudioPaused(status: AudioStatus): boolean {
  return isArticleAudioActive(status) && !status.playing && status.isLoaded && !status.isBuffering;
}
