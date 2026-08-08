import {
  clearAllPreloadedSources,
  clearPreloadedSource,
  createAudioPlayer,
  preload,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
  type AudioPlayerOptions,
} from 'expo-audio';
import { AppState, Platform } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { audioCache } from '@/services/audioCache';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { isRemoteAudioUrl } from '@/utils/cacheUtils';
import { handleError, toError } from '@/utils/errorHandling';
import { isSessionActive, mark } from '@/utils/reviewDiagnostics';
import { playTransitionSound } from '@/utils/transitionSound';

// Event constant for playback status updates
const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';

/**
 * Per-play tuning. Named (rather than inlined at the call site) so consumers —
 * and the React Compiler — see a plain object type instead of a
 * `Parameters<typeof play>[1]` indirection.
 */
export interface AudioPlayOptions {
  skipLoadingState?: boolean;
  isRetry?: boolean;
  /**
   * Cap on waiting for the source to load, overriding the local/remote
   * defaults. The review prompt sets this: a cache download that fails returns
   * the REMOTE url (audioCache.getAudio), which silently promotes the wait to
   * the 20 s streaming budget — on a one-word clip that is a 20 s hole with the
   * microphone gated behind it.
   */
  readyTimeoutMs?: number;
  /**
   * Native status emission interval for this track's player. Lower means
   * `didJustFinish` lands sooner, which matters only where something is gated
   * on end-of-clip (the review prompt gates the microphone). Left at the 500 ms
   * default everywhere else — article and playlist playback gain nothing from a
   * faster tick and would just pay for the extra events.
   */
  statusIntervalMs?: number;
  /**
   * iOS: keep the audio session active when this player pauses or finishes.
   *
   * expo-audio defaults this to `false`, which means a finishing player
   * DEACTIVATES the shared audio session. In a review session that session is
   * not ours alone — the voice provider holds it record-capable for the whole
   * screen (`setRecordingSessionEnabled` + `openCapture`) — so every prompt
   * that ended was tearing the session out from under the live microphone.
   * That previously left the held-open stream alive but deaf, and it matches the
   * measured decay: prompts start in ~30 ms and, once the mic has been used,
   * settle at ~4.2 s — one full `readyTimeoutMs` plus the internal retry.
   *
   * Set only where a microphone shares the session. Leaving it false elsewhere
   * keeps the default courtesy of releasing the session for other apps.
   */
  keepAudioSessionActive?: boolean;
}

// Marker for "the source never became ready" failures, so play() can tell a
// bad source (corrupt cached file / unreachable URL) apart from a corrupted
// audio session — only the latter is worth a session-reset retry.
const PLAYER_READY_TIMEOUT_MESSAGE = 'Player ready timeout - audio may be corrupted or unavailable';

// How often the native player emits a status update. 500 ms is right for the
// listening surfaces (a progress bar cannot use more), but it also bounds how
// quickly `didJustFinish` can be observed — and the review screen gates the
// microphone on exactly that event, so a prompt can read as "still playing" for
// up to half a second after the word has finished. Callers that care pass
// `statusIntervalMs`; see play().
const DEFAULT_UPDATE_INTERVAL_MS = 500;

// How often waitForPlayerReady re-checks `isLoaded`. See the poll in that
// method for why this is one frame rather than the 50 ms it used to be.
const READY_POLL_INTERVAL_MS = 16;

// Audio mode configuration for consistent behavior across iOS and Android.
//
// `allowsRecording` is deliberately NOT pinned on. On iOS, expo-audio maps it
// to AVAudioSession category .playAndRecord *with* .allowBluetooth/.allowBluetoothHFP
// (see expo-audio's AudioModule.setAudioMode) — so leaving it true put every
// piece of playback in the app, articles and playlists included, on the
// record-capable category, and routed output over the Bluetooth hands-free
// profile whenever a headset was around. HFP is an ~8 kHz telephony channel:
// that is audibly quieter and duller than the media route, and it flips as
// devices connect, which is exactly the intermittent "audio is low for a couple
// of answers" shape. The session now follows the actual need — plain .playback
// for listening, .playAndRecord only while the voice recorder is armed (see
// setRecordingSessionEnabled).
const AUDIO_MODE_CONFIG = {
  shouldPlayInBackground: true,
  playsInSilentMode: true,
  allowsRecording: false,
  // Unified field replaces the deprecated interruptionModeIOS / interruptionModeAndroid pair
  interruptionMode: 'doNotMix' as const,
  shouldRouteThroughEarpiece: false,
};

// Reset audio status constant for consistent state clearing
const RESET_AUDIO_STATUS = {
  playing: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  isBuffering: false,
  playbackState: 'idle' as const,
  timeControlStatus: 'paused' as const,
  reasonForWaitingToPlay: '',
  didJustFinish: false,
  error: null,
};

/**
 * The fields that describe what the player is DOING, as opposed to where the
 * play head is. A change to any of these is broadcast to every subscriber; a
 * change to `currentTime` / `duration` alone reaches only those that asked for
 * the clock.
 *
 * This split exists because the review lane runs its player at a 100 ms status
 * interval (the microphone is gated on `didJustFinish`, see AudioPlayOptions).
 * Without it, every one of those ticks re-rendered every React consumer of this
 * service — including the app-root GlobalAudioStateProvider — ten times a
 * second for the whole of every prompt, on every card.
 */
const TRANSPORT_KEYS = [
  'playing',
  'isLoaded',
  'isBuffering',
  'playbackState',
  'timeControlStatus',
  'reasonForWaitingToPlay',
  'didJustFinish',
  'error',
] as const satisfies readonly (keyof AudioStatus)[];

/** Per-subscription options for {@link SimpleAudioService.subscribe}. */
export interface AudioSubscribeOptions {
  /**
   * Also deliver `currentTime` / `duration` ticks. Only a consumer that draws a
   * play head needs these — everything else re-renders for nothing.
   */
  position?: boolean;
}

// Internal result of a single play attempt. 'superseded' means a newer
// play()/stop()/destroy() took over mid-flight — the stale call must return
// quietly (callers see `false`) without touching the player, status, or
// subscriptions the newer call now owns.
type PlayOutcome = 'failure' | 'success' | 'superseded';

/**
 * Playlist track that remembers the pre-resolution source URL.
 *
 * Playlist tracks resolve their audio through audioCache at build time (see
 * services/audioPlaylist.ts), so by the time play() fails the track only
 * carries a local cache path. sourceUrl lets the playlist lane invalidate the
 * corrupt cached copy and re-resolve — the same self-heal the review lane
 * performs in hooks/review/useReview.ts.
 */
export interface SourceTrackedAudioTrack extends EnhancedAudioTrack {
  /** Remote URL audioUrl was resolved from; absent for non-cached tracks. */
  sourceUrl?: string;
}

/**
 * Simple audio service - single source of truth for native audio player
 */

class SimpleAudioService {
  private currentPlayer: AudioPlayer | null = null;
  private currentTrack: EnhancedAudioTrack | null = null;
  /** Notified only when a transport field changes (see TRANSPORT_KEYS). */
  private transportListeners = new Set<(status: AudioStatus) => void>();
  /** Notified on every status update, ticks included. */
  private positionListeners = new Set<(status: AudioStatus) => void>();
  private eventSubscription: { remove: () => void } | null = null;
  private audioSessionConfigured = false;

  // Whether the session must currently allow recording. Held as state (rather
  // than baked into AUDIO_MODE_CONFIG) so every later reconfiguration —
  // including the one on AppState 'active' — re-applies the mode the app is
  // actually in, instead of silently dropping the recorder's category.
  private recordingSessionEnabled = false;

  private currentAudioMode(): typeof AUDIO_MODE_CONFIG {
    return { ...AUDIO_MODE_CONFIG, allowsRecording: this.recordingSessionEnabled };
  }

  // Time-based activation throttling to avoid redundant iOS audio session calls
  private lastActivationTime = 0;
  private readonly ACTIVATION_THROTTLE = 5000; // 5 seconds

  // GENERATION GUARD: Monotonic token for play() calls. Every play() attempt
  // captures its own generation; stop()/destroy() and each newer play()
  // advance the counter, so an older in-flight play() (e.g. one stuck in the
  // 5s ready wait) can detect it has been superseded and abort silently
  // instead of tearing down the newer call's live playback.
  private playGeneration = 0;

  // PLAYLIST SUPPORT: Add playlist state management
  private playlist: SourceTrackedAudioTrack[] = [];
  private currentPlaylistIndex = 0;
  private isPlaylistMode = false;
  private onPlaylistTrackComplete: ((nextTrack: EnhancedAudioTrack | null) => void) | null = null;
  private initialPlaylistLength = 0; // Track initial playlist size for transition sound logic
  // Consecutive playlist track failures (reset on any successful track) — the
  // skip-on-failure advance uses this to stop instead of looping forever when
  // every remaining source is broken.
  private consecutivePlaylistFailures = 0;

  // SLEEP TIMER SUPPORT: Track when sleep timer has expired
  private sleepTimerExpired = false;

  // RACE CONDITION GUARD: Prevent duplicate track advancement from rapid-fire events
  private isAdvancingTrack = false;

  // APP STATE SUPPORT: Track app state for background audio handling
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  // Current audio status — mirrors expo-audio's native AudioStatus shape
  // (see https://docs.expo.dev/versions/v55.0.0/sdk/audio) plus currentTrack.
  private status: AudioStatus = {
    playing: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
    isLoaded: false,
    isBuffering: false,
    playbackState: 'idle',
    timeControlStatus: 'paused',
    reasonForWaitingToPlay: '',
    didJustFinish: false,
    error: null,
  };

  /**
   * Reset all status fields to default values
   */
  private resetStatus(): void {
    this.updateStatus({
      ...RESET_AUDIO_STATUS,
      currentTrack: null,
    });
  }

  /**
   * Reset playlist state to default values
   */
  private resetPlaylistState(): void {
    this.isPlaylistMode = false;
    this.playlist = [];
    this.currentPlaylistIndex = 0;
    this.onPlaylistTrackComplete = null;
    this.initialPlaylistLength = 0;
    this.consecutivePlaylistFailures = 0;
    this.resetSleepTimerExpired();
  }

  /**
   * Safely activate audio session with proper error handling
   * Suppresses non-critical errors (e.g., background activation failures)
   * Only logs to Sentry for critical failures when app is active
   */
  private async safeActivateAudioSession(context: {
    location: string;
    playing?: boolean;
    isPlaylistMode?: boolean;
  }): Promise<void> {
    const appState = AppState.currentState;
    // Default to 'active' if AppState.currentState is undefined (test environments)
    const isAppActive = appState === 'active' || appState === undefined;
    const playing = context.playing ?? this.status.playing;
    const isPlaylistMode = context.isPlaylistMode ?? this.isPlaylistMode;
    const shouldBePlaying = playing || isPlaylistMode;

    // Skip activation if app is in background and not actively playing
    // iOS may reject activation in these scenarios, which is expected behavior
    if (!isAppActive && !shouldBePlaying) {
      return; // Silently skip - not an error condition
    }

    try {
      await setIsAudioActiveAsync(true);
      this.lastActivationTime = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Only log to Sentry if app is active and we're trying to play audio
      // Background activation failures are expected iOS behavior and not errors
      const shouldLogToSentry = isAppActive && shouldBePlaying;

      if (shouldLogToSentry) {
        await handleError(error, {
          showToast: false,
          sentryExtra: {
            operation: 'setIsAudioActiveAsync',
            location: context.location,
            appState,
            playing,
            isPlaylistMode,
            shouldBePlaying,
            errorMessage,
          },
        });
      }
      // Continue execution - audio may still work in some scenarios
    }
  }

  /**
   * Configure audio session for proper playback
   */
  private async configureAudioSession(): Promise<void> {
    if (this.audioSessionConfigured) {
      return;
    }

    try {
      // Ensure audio is active at the OS level (only if app is active)
      await this.safeActivateAudioSession({
        location: 'configureAudioSession',
        playing: false,
        isPlaylistMode: false,
      });

      await setAudioModeAsync(this.currentAudioMode());

      // Set up AppState listener for background audio handling
      this.setupAppStateListener();

      this.audioSessionConfigured = true;
    } catch (sessionError) {
      // This is critical - audio may not work properly
      throw new Error(`Audio session configuration failed: ${toError(sessionError).message}`);
    }
  }

  /**
   * Pre-configure audio session for faster first playback
   */
  async preconfigureAudioSession(): Promise<void> {
    await this.configureAudioSession();
  }

  /**
   * Put the shared audio session into (or out of) record-capable mode.
   *
   * The voice recorder needs AVAudioSession.playAndRecord, and on iOS
   * react-native-audio-api cannot switch to it under an already-active
   * playback-only session — so expo-audio has to grant it first. Everything
   * else in the app is better off on plain .playback: it is louder, and it
   * keeps output off the Bluetooth hands-free profile that .playAndRecord opts
   * into. Call with `true` when a review session claims the microphone and
   * `false` when it releases it — once each, not per card.
   *
   * react-native-audio-api applies its own session options straight after this
   * (`configureVoiceSessionOptions`, with `defaultToSpeaker` and no
   * `allowBluetoothHFP`) and those are what actually take effect, so the
   * hands-free route stays off for the session's lifetime.
   *
   * Best-effort: playback still works if the switch fails, so this never
   * throws into the voice pipeline.
   */
  async setRecordingSessionEnabled(enabled: boolean): Promise<void> {
    if (this.recordingSessionEnabled === enabled) return;
    this.recordingSessionEnabled = enabled;
    try {
      await setAudioModeAsync(this.currentAudioMode());
      // Releasing the mic: on iOS the category change alone does not move
      // output back off the route .playAndRecord opted into — notably the
      // Bluetooth hands-free profile — so the session has to be cycled. Owned
      // here rather than by the caller because there are two teardown paths
      // (natural finish and cancel) and only one of them used to do it, which
      // is why a manually revealed answer played quieter than one that timed
      // out. Arming is the recorder's job; it does its own deactivate first.
      if (!enabled && Platform.OS === 'ios') {
        await setIsAudioActiveAsync(true);
      }
    } catch (error) {
      await handleError(error, {
        showToast: false,
        sentryExtra: { operation: 'setRecordingSessionEnabled', enabled },
      });
    }
  }

  /**
   * Set up AppState listener for background audio handling
   */
  private setupAppStateListener(): void {
    // Remove existing listener if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', async nextAppState => {
      try {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App is going to background - ensure audio session stays active
          // Only attempt if we're actively playing (iOS may reject otherwise)
          if (this.status.playing || this.isPlaylistMode) {
            await this.safeActivateAudioSession({
              location: 'AppState.background',
              playing: this.status.playing,
              isPlaylistMode: this.isPlaylistMode,
            });
            // Re-configure audio session to maintain background playback
            try {
              await setAudioModeAsync(this.currentAudioMode());
            } catch {
              // Audio mode configuration may fail in background - not critical
            }
          }
        } else if (nextAppState === 'active') {
          // App is coming to foreground - reconfigure audio session
          // iOS may have invalidated the session while in background
          this.audioSessionConfigured = false;
          await this.configureAudioSession();
        }
      } catch (error) {
        // Don't log AppState listener errors to Sentry - they're often expected
        // (e.g., iOS rejecting audio activation in certain system states)
        // Only log if it's a critical error that prevents playback
        const playing = this.status.playing || this.isPlaylistMode;
        if (playing && nextAppState === 'active') {
          // Only log if we're trying to play and app became active
          await handleError(error, {
            showToast: false,
            sentryExtra: {
              operation: 'AppState.addEventListener',
              appState: nextAppState,
              playing,
              isPlaylistMode: this.isPlaylistMode,
            },
          });
        }
        // Don't throw errors from AppState listener as it can cause crashes
      }
    });
  }

  /**
   * Reset audio session for recovery from corruption
   */
  private async resetAudioSession(): Promise<void> {
    try {
      // Stop current playback
      await this.stopInternal();

      // Reset audio session configuration
      this.audioSessionConfigured = false;

      // Reconfigure audio session
      await this.configureAudioSession();

      // Reset status
      this.resetStatus();
    } catch (error) {
      // Even if reset fails, clear the configuration flag to force reconfiguration
      this.audioSessionConfigured = false;
      throw new Error(`Audio session reset failed: ${toError(error).message}`);
    }
  }

  /**
   * Wait for player to be ready before playing.
   * Listens for the first playbackStatusUpdate event indicating the source is
   * loaded. 5s timeout prevents hanging on corrupted or unreachable audio.
   *
   * Short-circuits on `player.isLoaded` — because we always create a fresh
   * player (see createFreshPlayer), the getter reflects only the current
   * source's state, never a stale value from a prior track. Without this
   * fast path, cached / local audio (word-tap, prefetched playlist) hits
   * the 5s timeout every time: createAudioPlayer can finish loading before
   * the listener below attaches, and the initial "loaded" event is then
   * lost. The double-check after subscribing closes the remaining race.
   *
   * Generation-guarded: if a newer play()/stop() supersedes the calling
   * play() while we wait, the poll/timeout stop touching the (possibly
   * removed) player and the promise resolves quietly — the caller re-checks
   * its generation right after this await and aborts.
   */
  private async waitForPlayerReady(
    generation: number,
    isRemoteSource = false,
    overrideTimeoutMs?: number,
  ): Promise<void> {
    const player = this.currentPlayer;
    if (!player) {
      return;
    }

    // Native reads on a removed expo SharedObject THROW — a newer play() may
    // have disposed this player while we wait. Treat that as "not loaded";
    // the generation checks below turn it into a quiet abort.
    const isLoadedSafe = (): boolean => {
      try {
        return player.isLoaded;
      } catch {
        return false;
      }
    };

    if (isLoadedSafe()) {
      return;
    }

    // A local file either loads almost instantly or is corrupt, so 5s is a
    // generous verdict there. A streamed remote source has to open a connection
    // and buffer first, and article audio now streams on a cache miss — judging
    // that by the local-file deadline would report a healthy stream as a dead
    // source on any slow network.
    const READY_TIMEOUT_MS = overrideTimeoutMs ?? (isRemoteSource ? 20000 : 5000);

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      // Only this call's OWN resources are cleaned up here (timeout, poll,
      // ready subscription). remove() is wrapped because the subscription may
      // belong to a player a newer play() has already released.
      const cleanup = (): void => {
        clearTimeout(timeout);
        clearInterval(poll);
        try {
          readySubscription.remove();
        } catch {
          // Player already released — nothing left to unsubscribe
        }
      };

      const resolveReady = (): void => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      // Superseded by a newer play()/stop(): resolve quietly — the caller
      // re-checks its generation after this await and aborts before touching
      // the (newer) player.
      const resolveSuperseded = (): void => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const timeout = setTimeout(() => {
        if (settled) return;
        if (generation !== this.playGeneration) {
          resolveSuperseded();
          return;
        }
        settled = true;
        cleanup();
        reject(new Error(PLAYER_READY_TIMEOUT_MESSAGE));
      }, READY_TIMEOUT_MS);

      const readySubscription = player.addListener(
        PLAYBACK_STATUS_UPDATE,
        (status: { isLoaded?: boolean; playbackState?: string }) => {
          if (status.isLoaded === true || status.playbackState === 'ready') resolveReady();
        },
      );

      // Poll isLoaded so we resolve the moment the freshly-created player finishes
      // loading, even when its initial "loaded" status event is never emitted
      // (a known race for a new AudioPlayer on a cached/local source). Without
      // this the event-only wait intermittently sits out the full 5s timeout,
      // delaying first playback — and, in Practice, the mic arming / "Listening…".
      // Generation-guarded: once superseded the poll stops instead of reading
      // a removed player.
      //
      // One frame rather than 50 ms: review audio is preloaded into native
      // memory before the session starts, so the load it is waiting on resolves
      // almost immediately and the interval was rounding that up to as much as
      // 50 ms on every prompt and every revealed answer. The poll only lives
      // for the duration of the load, so a tighter tick costs a handful of
      // extra `isLoaded` reads and nothing else.
      const poll = setInterval(() => {
        if (generation !== this.playGeneration) {
          resolveSuperseded();
          return;
        }
        if (isLoadedSafe()) resolveReady();
      }, READY_POLL_INTERVAL_MS);

      // Close the race where loading completed between the check above and the
      // listener/poll being attached.
      if (isLoadedSafe()) resolveReady();
    });
  }

  /**
   * Dispose any existing player and create a fresh one for the given source.
   *
   * We do not reuse via replace() — the native `isLoaded` getter can report
   * the previous source's value until the next status event fires, which
   * causes play() to silently no-op on a still-loading new source. Creating
   * a fresh player per track makes the load lifecycle unambiguous (the
   * canonical expo-audio pattern, equivalent to what useAudioPlayer does
   * when its source prop changes).
   */
  private createFreshPlayer(
    audioUrl: string,
    updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS,
    keepAudioSessionActive = false,
  ): AudioPlayer {
    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
      } catch {
        // Ignore pause errors
      }
      try {
        this.currentPlayer.remove();
      } catch {
        // Ignore remove errors
      }
      this.currentPlayer = null;
      this.lockScreenActive = false;
    }

    const playerOptions: AudioPlayerOptions = {
      updateInterval: updateIntervalMs,
      keepAudioSessionActive,
    };
    this.currentPlayer = createAudioPlayer(audioUrl, playerOptions);
    return this.currentPlayer;
  }

  /**
   * Start playing a track
   * @param track - The audio track to play
   * @param options - Playback options for optimization
   */
  async play(track: EnhancedAudioTrack, options: AudioPlayOptions = {}): Promise<boolean> {
    // Superseded plays report false too — the caller's attempt did not play,
    // but the newer call that superseded it owns any error handling.
    return (await this.playCore(track, options)) === 'success';
  }

  /**
   * Core play implementation with the generation guard.
   *
   * Each call takes the next generation token; after every await (and before
   * any cleanup or status mutation in the catch path) the token is compared
   * against the current generation. A mismatch means a newer play()/stop()
   * owns the player and status — the stale call aborts silently, cleaning up
   * nothing but its own local resources (see waitForPlayerReady).
   */
  private async playCore(
    track: EnhancedAudioTrack,
    options: AudioPlayOptions = {},
  ): Promise<PlayOutcome> {
    const generation = ++this.playGeneration;
    const isSuperseded = (): boolean => generation !== this.playGeneration;
    const playStartedAt = Date.now();

    // Note: the record-capable category is deliberately NOT taken back here.
    // A review session holds it for its whole life (VoiceGradingProvider
    // .acquireSession) precisely so that no card pays for a category change,
    // and this used to release it on every prompt and every revealed answer.
    // What it was actually protecting against — the app recording its own
    // playback — is handled a level up: the capture window is closed while the
    // prompt plays, and buffers arriving outside a window are discarded.
    try {
      // A foreign track (word preview, practice audio) played mid-playlist must
      // exit playlist mode first — otherwise its didJustFinish would trigger
      // advanceToNextTrack and hijack playback back into the stale playlist.
      // Legitimate playlist advancement always plays tracks from this.playlist,
      // so this never fires for it.
      if (this.isPlaylistMode && !this.playlist.some(t => t.id === track.id)) {
        this.resetPlaylistState();
      }

      // Throttled session activation: Only activate if not recently activated (5s window)
      // Reduces redundant calls during practice sessions while maintaining iOS reliability
      const now = Date.now();
      if (now - this.lastActivationTime > this.ACTIVATION_THROTTLE) {
        await this.safeActivateAudioSession({
          location: 'play',
          playing: false, // Not playing yet, but about to
          isPlaylistMode: false,
        });
        if (isSuperseded()) {
          return 'superseded';
        }
      }

      // Configure audio session first (should be pre-configured for faster playback)
      await this.configureAudioSession();
      if (isSessionActive()) {
        mark('player.session-ready', { ms: Date.now() - playStartedAt });
      }
      if (isSuperseded()) {
        return 'superseded';
      }

      // Stop event subscription from previous track before swapping the player
      this.stopEventSubscription();

      // Always create a fresh player — see createFreshPlayer for rationale
      const player = this.createFreshPlayer(
        track.audioUrl,
        options.statusIntervalMs,
        options.keepAudioSessionActive,
      );
      this.currentTrack = track;

      // IMMEDIATE FEEDBACK: Update status to loading right away
      // RESET: Ensure progress starts from 0 for new tracks
      // FLICKER FIX: Skip loading state for playlist starts (audio is cached, loads instantly)
      if (!options.skipLoadingState) {
        this.updateStatus({
          playing: false,
          currentTrack: this.currentTrack,
          currentTime: 0,
          duration: 0,
          isLoaded: false,
          isBuffering: true,
          playbackState: 'idle',
          timeControlStatus: 'paused',
          reasonForWaitingToPlay: '',
          didJustFinish: false,
        });
      }

      // Set up event subscription BEFORE playing to catch immediate failures
      this.startEventSubscription();

      // Wait for the freshly-created player to load the source. expo-audio's
      // play() silently no-ops on an unloaded source, so we must proactively
      // wait for a ready event before calling it. A ready timeout is a real
      // failure: playing anyway would report success while producing silence
      // (the "sound just doesn't play" bug), and would keep a corrupt cached
      // file undetectable — callers invalidate the cache and retry on failure.
      const readyStartedAt = Date.now();
      await this.waitForPlayerReady(
        generation,
        isRemoteAudioUrl(track.audioUrl),
        options.readyTimeoutMs,
      );
      if (isSessionActive()) {
        mark('player.ready', { ms: Date.now() - readyStartedAt, superseded: isSuperseded() });
      }
      if (isSuperseded()) {
        // A newer play()/stop() already disposed our player via
        // createFreshPlayer/stopInternal — nothing of ours is left to clean.
        return 'superseded';
      }

      // A synchronous throw here (e.g. a session conflict) is a real failure
      // handled by the catch below (session reset + one retry with a FRESH
      // player). Blindly re-invoking play() on this same player could never
      // succeed — waitForPlayerReady would return immediately since isLoaded
      // is already true — and in overlap interleavings it double-invoked a
      // removed player.
      player.play();

      // Activate lock screen controls AFTER play() — Android's mediaPlayback
      // foreground service refuses to bind unless an active MediaSession exists
      // to attach to. Binding pre-play yielded "service binding failed" warnings
      // on Android 14+ even though the FGS declaration and permissions are
      // correct. iOS is order-insensitive here; doing this last works for both.
      //
      // Gated to playlist mode only — single-shot plays (word audio in practice,
      // word-tap audio in article reading) are ~2s long, never backgrounded
      // mid-play, and would just push transient garbage into the OS lock screen.
      // Binding the FGS for those also triggered spurious "service binding
      // failed" warnings on Android with nothing to show for it.
      if (this.isPlaylistMode) {
        this.activateLockScreen(track);
      }

      // Update status to playing (actual state will come from event subscription)
      // Note: Native states (isLoaded, isBuffering) will be updated by event subscription
      this.updateStatus({
        playing: true,
        currentTrack: this.currentTrack,
        currentTime: 0,
        duration: 0,
      });

      // Preload next playlist track in native memory for faster transition
      this.preloadNextTrack();

      return 'success';
    } catch (error) {
      // GENERATION GUARD: never run failure cleanup against a newer call's
      // player/status — this.currentPlayer may already be the newer player.
      // Our own resources were cleaned up locally (waitForPlayerReady) and
      // our player/subscription were disposed by the newer call itself.
      if (isSuperseded()) {
        return 'superseded';
      }

      // RESET: Clear progress on play error
      this.updateStatus(RESET_AUDIO_STATUS);

      // Destroy player on error so retry gets a fresh one
      if (this.currentPlayer) {
        try {
          this.currentPlayer.pause();
          this.currentPlayer.remove();
        } catch {
          // Ignore cleanup errors
        }
        this.currentPlayer = null;
        this.currentTrack = null;
      }
      this.stopEventSubscription();

      // CRITICAL FIX: Try to recover from audio session corruption (only on first
      // attempt). Skipped for ready timeouts — those are a source problem
      // (corrupt file / dead URL), and replaying the same source would just burn
      // another 5s to fail again; the caller's cache-invalidate retry handles it.
      const isReadyTimeout =
        error instanceof Error && error.message === PLAYER_READY_TIMEOUT_MESSAGE;
      if (!options.isRetry && !isReadyTimeout) {
        try {
          await this.resetAudioSession();
          if (isSuperseded()) {
            // A newer play()/stop() arrived during the reset — don't resurrect
            // this track over it.
            return 'superseded';
          }

          // Retry playback once after reset with isRetry flag to prevent infinite recursion
          const retryOutcome = await this.playCore(track, { ...options, isRetry: true });
          if (retryOutcome !== 'failure') {
            return retryOutcome;
          }
          // 'failure' falls through to the error handling below
        } catch {
          // Reset failed, continue with error handling
        }
      }

      // No toast for ready timeouts: the self-healing lanes — review
      // (useReview.playAudio) and playlist (playPlaylistTrack) — invalidate
      // the cached file and retry on failure, and toasting before that
      // resolves would flash an error over audio that is about to work.
      // Single-shot callers without self-heal fail quietly too; the playlist
      // lane surfaces exactly one toast itself if it ultimately stops.
      handleError(error, {
        showToast: !isReadyTimeout,
        toastMessage: 'Failed to start audio playback',
      });
      return 'failure';
    }
  }

  /**
   * PLAYLIST SUPPORT: Start playing a playlist of tracks
   */
  async playPlaylist(
    tracks: SourceTrackedAudioTrack[],
    onTrackComplete?: (nextTrack: EnhancedAudioTrack | null) => void,
  ): Promise<boolean> {
    if (!tracks.length) {
      return false;
    }

    try {
      this.playlist = [...tracks];
      this.currentPlaylistIndex = 0;
      this.isPlaylistMode = true;
      this.onPlaylistTrackComplete = onTrackComplete || null;
      this.initialPlaylistLength = tracks.length; // Store initial playlist length
      this.consecutivePlaylistFailures = 0;

      // Reset sleep timer expired flag when starting new playlist
      this.resetSleepTimerExpired();

      // Start with the first track
      const firstTrack = tracks[0];
      if (!firstTrack) {
        return false;
      }

      // FLICKER FIX: skip the loading state for a CACHED track — a local file
      // loads instantly and the intermediate state would just flash.
      //
      // A streamed track is the opposite case: it has to open a connection and
      // buffer, and suppressing the loading state there meant nothing was
      // published until playback actually began — no currentTrack, so the
      // MiniPlayer stayed hidden and the Listen button stayed on "play" for the
      // whole buffer. That silence *is* the reported "Listen takes several
      // seconds to show up". Publishing the loading state puts the player on
      // screen immediately, buffering, with the article's title and artwork.
      const isStreaming = isRemoteAudioUrl(firstTrack.audioUrl);
      return (
        (await this.playPlaylistTrack(firstTrack, { skipLoadingState: !isStreaming })) === 'success'
      );
    } catch (error) {
      this.isPlaylistMode = false;
      this.playlist = [];
      this.currentPlaylistIndex = 0;
      this.onPlaylistTrackComplete = null;
      this.initialPlaylistLength = 0;
      this.consecutivePlaylistFailures = 0;
      this.resetSleepTimerExpired();
      throw error;
    }
  }

  /**
   * Playlist lane: play a track with the cache self-heal the review lane has
   * (see hooks/review/useReview.ts playAudio). A cached copy that fails to
   * load is almost always a corrupt/partial download poisoning the cache —
   * without purging it the same broken file would be served on every future
   * play of that track. Invalidate and retry ONCE against a fresh resolve
   * (re-download, or the remote URL when the download fails).
   */
  private async playPlaylistTrack(
    track: SourceTrackedAudioTrack,
    options: { skipLoadingState?: boolean } = {},
  ): Promise<PlayOutcome> {
    const outcome = await this.playCore(track, options);
    if (outcome === 'success') {
      this.consecutivePlaylistFailures = 0;
      return outcome;
    }
    if (outcome === 'superseded') {
      return outcome;
    }

    const { sourceUrl } = track;
    if (!sourceUrl || sourceUrl === track.audioUrl || isRemoteAudioUrl(track.audioUrl)) {
      // The failure wasn't served from cache (remote stream / plain local
      // file) — there is nothing to heal.
      return 'failure';
    }

    const generationAtFailure = this.playGeneration;
    await audioCache.invalidate(sourceUrl);
    const freshAudioUrl = await audioCache.getAudio(sourceUrl, { quick: true });
    if (this.playGeneration !== generationAtFailure) {
      // A newer play()/stop() started while the source was re-resolving —
      // don't hijack it with a stale retry.
      return 'superseded';
    }

    const retryOutcome = await this.playCore({ ...track, audioUrl: freshAudioUrl }, options);
    if (retryOutcome === 'success') {
      this.consecutivePlaylistFailures = 0;
      // Point the stored entry at the healed source so a replay of this track
      // doesn't serve the (now deleted) stale cache path again.
      const storedIndex = this.playlist.findIndex(t => t.id === track.id);
      const storedTrack = this.playlist[storedIndex];
      if (storedTrack) {
        this.playlist[storedIndex] = { ...storedTrack, audioUrl: freshAudioUrl };
      }
    }
    return retryOutcome;
  }

  /**
   * Preload the next playlist track in native memory for faster transition
   */
  private preloadNextTrack(): void {
    if (!this.isPlaylistMode) return;

    const nextIndex = this.currentPlaylistIndex + 1;
    const nextTrack = this.playlist[nextIndex];
    if (nextTrack) {
      try {
        preload(nextTrack.audioUrl).catch(() => {
          // Non-critical — playback will still work without preload
        });
      } catch {
        // Non-critical — preload is an optimization
      }
    }
  }

  /**
   * PLAYLIST SUPPORT: Advance to the next track in the playlist.
   *
   * Failure policy: a track that still fails after its cache self-heal retry
   * (playPlaylistTrack) is SKIPPED rather than halting the playlist. The
   * consecutive-failure counter (reset on any successful track) bounds the
   * skipping, and exactly one toast is surfaced when the playlist stops
   * because of failures.
   */
  private async advanceToNextTrack(): Promise<boolean> {
    if (!this.isPlaylistMode || !this.playlist.length) {
      return false;
    }

    this.currentPlaylistIndex++;

    // The just-finished (or just-failed) track — its preloaded native buffer
    // is released via releasePreloadedTrackBuffer AFTER the advance decision
    // below: the release has zero ordering dependency on advancing, so it
    // stays entirely out of the advance's critical path.
    const previousTrack = this.playlist[this.currentPlaylistIndex - 1];

    if (this.currentPlaylistIndex >= this.playlist.length) {
      // Playlist is complete. If we only reached the end by skipping failed
      // tracks, this is really a failure stop — tell the user why the audio
      // went silent (the per-track ready-timeout failures are quiet).
      const stoppedByFailures = this.consecutivePlaylistFailures > 0;
      this.resetPlaylistState();

      // Stop playback and notify completion
      await this.stop();
      this.releasePreloadedTrackBuffer(previousTrack);
      if (stoppedByFailures) {
        this.notifyPlaylistStoppedByFailures();
      }
      return false;
    }

    // Play transition sound between tracks if playlist has more than 1 track
    if (this.initialPlaylistLength > 1) {
      // CRITICAL: Pause current player to release audio session for transition sound
      // Without this, the transition sound fails to acquire the audio session
      if (this.currentPlayer) {
        try {
          this.currentPlayer.pause();
        } catch {
          // Ignore pause errors - transition sound will still attempt to play
        }
      }

      await playTransitionSound();

      // A foreign play() during the transition sound exits playlist mode —
      // don't advance a playlist the user just navigated away from.
      if (!this.isPlaylistMode) {
        return false;
      }
    }

    // Play the next track (with cache self-heal and skip-on-failure)
    const nextTrack = this.playlist[this.currentPlaylistIndex];
    if (!nextTrack) {
      return false;
    }

    this.releasePreloadedTrackBuffer(previousTrack);

    const outcome = await this.playPlaylistTrack(nextTrack);
    if (outcome === 'success') {
      if (this.onPlaylistTrackComplete) {
        this.onPlaylistTrackComplete(nextTrack);
      }
      return true;
    }
    if (outcome === 'superseded') {
      // A newer play()/stop() owns playback now — abort the advance silently.
      return false;
    }

    // The track failed even after the self-heal retry: skip it instead of
    // halting the playlist. The counter guards against an endless skip loop
    // when every remaining source is broken.
    this.consecutivePlaylistFailures++;
    if (this.consecutivePlaylistFailures >= this.playlist.length) {
      this.resetPlaylistState();
      await this.stop();
      this.notifyPlaylistStoppedByFailures();
      return false;
    }
    return this.advanceToNextTrack();
  }

  /**
   * Release a track's preloaded native audio buffer, fire-and-forget.
   *
   * iOS consumes a preloaded source when a player uses it, but Android keeps
   * preloaded sources alive until explicitly cleared — without this, a long
   * playlist session accumulates native buffers. Clearing a consumed or
   * unknown source is a safe no-op; anything left over is reclaimed by
   * clearAllPreloadedSources at destroy/session end.
   */
  private releasePreloadedTrackBuffer(track: SourceTrackedAudioTrack | undefined): void {
    if (!track) {
      return;
    }
    clearPreloadedSource(track.audioUrl).catch(() => {
      // Non-critical — buffer is reclaimed at destroy/session end
    });
  }

  /**
   * ONE user-visible toast when playlist playback stops because tracks kept
   * failing — the individual track failures are deliberately quiet (see the
   * ready-timeout handling in playCore's catch).
   */
  private notifyPlaylistStoppedByFailures(): void {
    handleError(new Error('Playlist stopped after repeated track playback failures'), {
      showToast: true,
      toastMessage: STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS,
    });
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    // GENERATION GUARD: invalidate any in-flight play() so it aborts silently
    // instead of resurrecting player/status state after this stop.
    this.playGeneration++;
    try {
      // IMMEDIATE FEEDBACK: Update status immediately when stop is called
      this.updateStatus({ playing: false });

      // PLAYLIST SUPPORT: Reset playlist state when stopping
      this.resetPlaylistState();

      await this.stopInternal();
      // RESET: Clear all progress and track data when stopping
      this.resetStatus();
    } catch (stopError) {
      // RESET: Even on error, ensure all progress is cleared
      this.resetStatus();
      // Re-throw to make the error visible
      throw new Error(`Failed to stop audio playback: ${toError(stopError).message}`);
    }
  }

  /**
   * Seek to position
   */
  async seekTo(position: number): Promise<void> {
    try {
      if (this.currentPlayer) {
        await this.currentPlayer.seekTo(position);
        this.updateStatus({ currentTime: position });
      }
    } catch (seekError) {
      // Re-throw to make the error visible
      throw new Error(`Failed to seek audio playback: ${toError(seekError).message}`);
    }
  }

  /**
   * Get current status.
   *
   * Returns the live snapshot, not a copy. `updateStatus` never mutates in
   * place — it always assigns a freshly spread object — so the value handed out
   * here is effectively frozen, and it is the same object listeners receive.
   * The copy this used to make was allocated on every call, and the review
   * lane's prompt watcher calls it ten times a second for the length of every
   * prompt. Treat the result as read-only.
   */
  getStatus(): AudioStatus {
    return this.status;
  }

  /**
   * PLAYLIST SUPPORT: Get playlist information
   */
  getPlaylistInfo(): { isPlaylistMode: boolean; currentIndex: number; totalTracks: number } {
    return {
      isPlaylistMode: this.isPlaylistMode,
      currentIndex: this.currentPlaylistIndex,
      totalTracks: this.playlist.length,
    };
  }

  /**
   * SLEEP TIMER SUPPORT: Mark that sleep timer has expired
   */
  markSleepTimerExpired(): void {
    this.sleepTimerExpired = true;
  }

  /**
   * SLEEP TIMER SUPPORT: Check if sleep timer has expired
   */
  isSleepTimerExpired(): boolean {
    return this.sleepTimerExpired;
  }

  /**
   * SLEEP TIMER SUPPORT: Reset sleep timer expired flag
   */
  resetSleepTimerExpired(): void {
    this.sleepTimerExpired = false;
  }

  /**
   * Subscribe to status updates.
   *
   * By default a listener hears about transport changes only — started,
   * stopped, loaded, buffering, finished, failed. Pass `{ position: true }` to
   * also receive the play-head ticks; see TRANSPORT_KEYS for why that is opt-in.
   */
  subscribe(listener: (status: AudioStatus) => void, options?: AudioSubscribeOptions): () => void {
    const set = options?.position ? this.positionListeners : this.transportListeners;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /**
   * Subscribe to native player events for status updates
   */
  private startEventSubscription(): void {
    // Clear existing subscription
    this.stopEventSubscription();

    if (!this.currentPlayer) {
      return;
    }

    // Subscribe to native playback status updates
    this.eventSubscription = this.currentPlayer.addListener(
      PLAYBACK_STATUS_UPDATE,
      (nativeStatus: {
        playing?: boolean;
        currentTime?: number;
        duration?: number;
        isLoaded?: boolean;
        isBuffering?: boolean;
        playbackState?: string;
        timeControlStatus?: string;
        reasonForWaitingToPlay?: string;
        didJustFinish?: boolean;
        error?: string | null;
        mediaServicesDidReset?: boolean;
      }) => {
        try {
          const currentTime = nativeStatus.currentTime ?? 0;
          const duration = nativeStatus.duration ?? 0;
          const didJustFinish = nativeStatus.didJustFinish ?? false;

          // iOS only: the system media daemon crashed and took the audio
          // session with it. expo-audio reloads the source itself, but our
          // cached "session is configured" flag is now a lie — every category
          // and activation we applied is gone. Clearing it makes the next play()
          // reconfigure from scratch instead of trusting a session that no
          // longer exists.
          if (nativeStatus.mediaServicesDidReset === true) {
            this.audioSessionConfigured = false;
            if (isSessionActive()) {
              mark('player.mediaServicesDidReset');
            }
          }

          // Guard against NaN/Infinity from native — observed during seek/replace.
          const safeCurrentTime =
            isNaN(currentTime) || !isFinite(currentTime) ? 0 : Math.max(0, currentTime);
          const safeDuration = isNaN(duration) || !isFinite(duration) ? 0 : Math.max(0, duration);

          // PLAYLIST SUPPORT: Use native didJustFinish for track completion
          if (this.isPlaylistMode && didJustFinish) {
            // RACE CONDITION GUARD: Prevent duplicate advancement from rapid-fire events
            if (this.isAdvancingTrack) {
              return; // Already advancing, ignore duplicate event
            }

            // Don't advance if sleep timer has expired
            if (this.sleepTimerExpired) {
              // Sleep timer expired - stop playlist instead of advancing
              this.resetPlaylistState();
              this.stop().catch(() => {
                // Stop failed - continue with current track
              });
              return;
            }

            // Mark as advancing before async operation
            this.isAdvancingTrack = true;

            // Track just finished, advance to next track
            this.advanceToNextTrack()
              .catch(() => {
                // Track advancement failed - continue with current track
              })
              .finally(() => {
                this.isAdvancingTrack = false; // Reset guard
              });
            return;
          }

          // SINGLE TRACK SUPPORT: Use native didJustFinish for completion
          if (!this.isPlaylistMode && didJustFinish) {
            // Single track has finished playing, reset status but keep player for potential replay
            this.stopEventSubscription();
            this.updateStatus({
              playing: false,
              currentTime: safeDuration,
              duration: safeDuration,
              isLoaded: nativeStatus.isLoaded ?? false,
              isBuffering: false,
              playbackState: 'ended',
              timeControlStatus: nativeStatus.timeControlStatus ?? 'paused',
              reasonForWaitingToPlay: nativeStatus.reasonForWaitingToPlay ?? '',
              didJustFinish: true,
              error: nativeStatus.error ?? null,
            });
            return;
          }

          // Native updateInterval (500ms) caps emission rate; the hook layer dedupes
          // identical values via setState(prev => prev). No JS throttle needed here.
          this.updateStatus({
            playing: nativeStatus.playing ?? false,
            currentTime: safeCurrentTime,
            duration: safeDuration,
            isLoaded: nativeStatus.isLoaded ?? false,
            isBuffering: nativeStatus.isBuffering ?? false,
            playbackState: nativeStatus.playbackState ?? 'unknown',
            timeControlStatus: nativeStatus.timeControlStatus ?? 'paused',
            reasonForWaitingToPlay: nativeStatus.reasonForWaitingToPlay ?? '',
            didJustFinish,
            // Published by expo-audio and previously discarded: a real reason
            // the source failed, instead of inferring one from a ready timeout.
            error: nativeStatus.error ?? null,
          });
        } catch {
          // Stop subscription on error
          this.stopEventSubscription();
          // RESET: Clear progress on event error
          this.updateStatus(RESET_AUDIO_STATUS);
        }
      },
    );
  }

  /**
   * Stop event subscription
   */
  private stopEventSubscription(): void {
    if (this.eventSubscription) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }
  }

  // Track whether lock screen has been activated for the current player
  private lockScreenActive = false;

  /**
   * Activate lock screen controls with track metadata (best-effort)
   * Uses updateLockScreenMetadata for subsequent tracks in a playlist
   * to avoid the heavier setActiveForLockScreen re-activation
   */
  private activateLockScreen(track: EnhancedAudioTrack): void {
    if (!this.currentPlayer) return;
    try {
      const metadata = {
        title: track.title,
        artist: track.artist,
        artworkUrl: track.imageUrl,
      };

      if (this.lockScreenActive) {
        // Lock screen already active — just update metadata (lighter call)
        this.currentPlayer.updateLockScreenMetadata(metadata);
      } else {
        // First activation — full setup with controls configuration
        this.currentPlayer.setActiveForLockScreen(true, metadata, {
          showSeekForward: this.isPlaylistMode,
          showSeekBackward: this.isPlaylistMode,
        });
        this.lockScreenActive = true;
      }
    } catch {
      // Non-critical — lock screen controls are best-effort
    }
  }

  /**
   * Internal stop method - disposes player fully.
   */
  private async stopInternal(): Promise<void> {
    this.stopEventSubscription();

    if (this.currentPlayer) {
      const player = this.currentPlayer;
      this.currentPlayer = null;

      // Per-call try/catch so pause()+remove() always run even if
      // clearLockScreenControls() throws (e.g. when the native side has
      // already torn the player down). Otherwise the native AudioPlayer
      // leaks and continues holding the iOS audio session.
      try {
        player.clearLockScreenControls();
      } catch {
        // Lock screen teardown failed — proceed with player release
      }
      this.lockScreenActive = false;
      try {
        player.pause();
      } catch {
        // Pause failed — still attempt remove
      }
      try {
        player.remove();
      } catch {
        // Player remove failed — native side may already be detached
      }
    }
    this.currentTrack = null;
  }

  /**
   * Update audio status and notify listeners.
   *
   * Position subscribers hear every update. Transport subscribers hear only the
   * ones where something they care about actually changed, so a 100 ms review
   * prompt does not wake the whole app ten times a second.
   */
  private updateStatus(updates: Partial<AudioStatus>): void {
    const previous = this.status;
    this.status = { ...previous, ...updates };

    this.notify(this.positionListeners);

    const transportChanged =
      TRANSPORT_KEYS.some(key => previous[key] !== this.status[key]) ||
      (previous.currentTrack?.id ?? null) !== (this.status.currentTrack?.id ?? null);
    if (transportChanged) {
      this.notify(this.transportListeners);
    }
  }

  /** Fan out the current status, dropping any listener that throws. */
  private notify(listeners: Set<(status: AudioStatus) => void>): void {
    // Copy so a listener unsubscribing during the fan-out can't skip a sibling.
    new Set(listeners).forEach(listener => {
      try {
        listener(this.status);
      } catch {
        listeners.delete(listener);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // GENERATION GUARD: invalidate any in-flight play() so it aborts silently
    // instead of resurrecting state after teardown.
    this.playGeneration++;
    await this.stopInternal();

    // Clear all listeners to prevent memory leaks
    this.transportListeners.clear();
    this.positionListeners.clear();

    // Clean up AppState listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Free native preloaded audio buffers — useAudioPreloader clears these at
    // session complete, but if the app is killed mid-session those buffers
    // outlive the practice screen. Belt-and-suspenders cleanup at app teardown.
    try {
      await clearAllPreloadedSources();
    } catch {
      // Non-critical — buffers will be reclaimed when the process exits
    }

    // Best-effort to release audio session
    // Don't throw errors during cleanup - they're not critical
    try {
      await setIsAudioActiveAsync(false);
    } catch {
      // Silently ignore cleanup errors - audio session will be released when app terminates
    }

    // Reset internal state to prevent stale references
    this.audioSessionConfigured = false;
    this.lockScreenActive = false;
    this.isPlaylistMode = false;
    this.playlist = [];
    this.currentPlaylistIndex = 0;
    this.onPlaylistTrackComplete = null;
    this.initialPlaylistLength = 0;
    this.consecutivePlaylistFailures = 0;
  }
}

// Mirrors expo-audio's native AudioStatus shape (see expo-audio docs) plus currentTrack.
// Field names match the native event payload so there's no translation layer.
export interface AudioStatus {
  playing: boolean;
  currentTime: number;
  duration: number;
  currentTrack: EnhancedAudioTrack | null;
  isLoaded: boolean;
  isBuffering: boolean;
  playbackState: string;
  timeControlStatus: string;
  reasonForWaitingToPlay: string;
  didJustFinish: boolean;
  /** Playback error message from the native player, or null. Cleared when a
   *  new source loads or playback resumes. */
  error: string | null;
}

// Export singleton instance
export const simpleAudioService = new SimpleAudioService();
