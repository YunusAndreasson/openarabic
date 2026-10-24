import { useSyncExternalStore } from 'react';

import {
  simpleAudioService,
  type AudioStatus,
  type AudioSubscribeOptions,
} from '@/services/audioPlayer';

// Module scope, so React sees the same subscribe function on every render and
// never re-subscribes.
function subscribeToTransport(onStoreChange: () => void): () => void {
  return simpleAudioService.subscribe(onStoreChange);
}

function subscribeToPosition(onStoreChange: () => void): () => void {
  return simpleAudioService.subscribe(onStoreChange, { position: true });
}

/**
 * One reading of the audio service's status, re-rendering the caller only when
 * that reading changes.
 *
 * `select` must return a primitive or a reference the status already holds
 * (`status.currentTrack`, `status.queue`) — never a fresh object, which would
 * read as a change on every call. Prefer a module-scope selector; the pure ones
 * live in `articleAudioStatus.ts`.
 *
 * Transport only by default: started / stopped / loaded / buffering / finished
 * / failed. Play-head ticks are filtered out by the service (see TRANSPORT_KEYS
 * in services/audioPlayer.ts), because the review lane runs its player at a
 * 100 ms status interval and every subscriber used to re-render ten times a
 * second for the whole of every prompt. Pass `{ position: true }` only to draw
 * a play head, and mount that subscriber as close to the drawing as possible.
 *
 * The snapshot is read from the service on demand rather than copied out of a
 * listener, so a render can never see a status older than the one the service
 * holds.
 */
export function useAudioSelector<T>(
  select: (status: AudioStatus) => T,
  { position = false }: AudioSubscribeOptions = {},
): T {
  const getSnapshot = (): T => select(simpleAudioService.getStatus());
  return useSyncExternalStore(
    position ? subscribeToPosition : subscribeToTransport,
    getSnapshot,
    getSnapshot,
  );
}
