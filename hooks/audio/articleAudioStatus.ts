import type { AudioQueuePosition, AudioStatus } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId } from '@/types/branded.types';

/**
 * Pure readings of the audio service's status, kept out of the hook modules so
 * the app-root audio state, the service itself and plain utilities can share
 * them without importing a hook module (which the jest setup replaces
 * wholesale). Each is written once here: the same "is it loading" test used to
 * be derived by hand in four places, and the copies had drifted.
 *
 * Review prompts, word previews and practice clips intentionally omit
 * `articleId` from their tracks, so the ARTICLE readings never describe one of
 * them.
 *
 * Every reading returns a primitive or a reference the status itself holds,
 * which is what `useAudioSelector` needs to skip renders that change nothing.
 */

export const isAudioPlaying = (status: AudioStatus): boolean => status.playing;

export const currentAudioTrack = (status: AudioStatus): EnhancedAudioTrack | null =>
  status.currentTrack;

/** A single track that played to its end. Playlist mode never publishes this between tracks. */
export const isAudioEnded = (status: AudioStatus): boolean => status.playbackState === 'ended';

export const audioQueuePosition = (status: AudioStatus): AudioQueuePosition | null => status.queue;

/** The play head in whole seconds — all a clock can show. */
export const wholeSecondsPosition = (status: AudioStatus): number => Math.floor(status.currentTime);

export const wholeSecondsDuration = (status: AudioStatus): number => Math.floor(status.duration);

/**
 * A track is loaded into the player but cannot sound yet: still opening its
 * source, or buffering.
 *
 * Gated on the track: with no current track the service is idle, not busy. The
 * default `isLoaded: false` of a freshly-mounted service must not be read as
 * "still loading" — that would block the very first play attempt.
 */
export function isAudioLoading(status: AudioStatus): boolean {
  return status.currentTrack !== null && (!status.isLoaded || status.isBuffering);
}

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

/** The article the player is on — playing, buffering or paused — or null. */
export function nowPlayingArticleId(status: AudioStatus): ArticleId | null {
  return isArticleAudioActive(status) ? (status.currentTrack?.articleId ?? null) : null;
}
