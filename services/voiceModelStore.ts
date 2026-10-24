/**
 * Voice model availability — the ~103 MB Parakeet archive on disk.
 *
 * This module owns ONE question: are the model's bytes present, and if not, are
 * they on their way? It knows nothing about `voiceEnabled`, nothing about the
 * recognizer engine, and nothing about React.
 *
 * WHY IT IS A MODULE AND NOT A HOOK
 * =================================
 * The download has to outlive every component that starts it. Before this split,
 * download and engine-load were one effect in `useSherpaStt` keyed on
 * `voiceEnabled`, and its cleanup called `abortController.abort()` — which for a
 * sherpa download means `task.stop()` (the native transfer is cancelled and the
 * partial file discarded) AND `unlink(statePath)` (the resume record is deleted).
 * A provider remount, a Fast Refresh, or the learner toggling the setting threw
 * away up to 103 MB with no way to resume it. Module state has no cleanup, which
 * is precisely the property wanted here.
 *
 * **There is no AbortController anywhere in this file, and adding one would
 * reintroduce that bug.** `__tests__/services/voiceModelStore.test.ts` asserts
 * structurally that no `signal` reaches the library. If a "stop downloading"
 * control is ever wanted, it must be a separate export named for what it does —
 * it destroys progress, it does not pause it.
 *
 * The transfer itself is an OS background task (the sherpa SDK downloads through
 * `@kesha-antonov/react-native-background-downloader`), so it survives the app
 * being backgrounded and, on iOS, the app being terminated while suspended. In
 * that last case the JS `done` handler never runs in that process; the next
 * launch reattaches via the library's `getIncompleteDownloads`/`resumeDownload`
 * path inside `ensureModelByCategory`. That is why `probeVoiceModel()` runs at
 * startup and on resume, and why `requestVoiceModel()` is safe to call again.
 *
 * The snapshot reaches React through `useSyncExternalStore` (see
 * `hooks/voice/useVoiceModel.ts`) and never through a getter called in render:
 * the React Compiler treats a module read as pure and caches it for the
 * component's lifetime, which would freeze "Preparing voice… 4%" forever. The
 * same trap is documented on `ReviewDiagSnapshot` in `utils/reviewDiagnostics.ts`.
 */
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { DocumentDirectoryPath, mkdir } from '@dr.pogodin/react-native-fs';
import { Platform } from 'react-native';
import {
  ModelCategory,
  deleteModelByCategory,
  ensureModelByCategory,
  isModelDownloadedByCategory,
  getLocalModelPathByCategory,
  refreshModelsByCategory,
  type DownloadProgress,
} from 'react-native-sherpa-onnx/download';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { PARAKEET_MODEL_ID } from '@/constants/voiceModel';
import { analytics } from '@/services/analytics';
import { createExternalStore } from '@/utils/createExternalStore';
import { voiceBreadcrumb } from '@/utils/errorHandling';
import { toError } from '@/utils/toError';

export type VoiceModelState =
  /** Not probed yet this app run. */
  | 'unknown'
  /** Probed, not on disk, nothing running. */
  | 'absent'
  /** Wanted, but the connection is metered and there is no cellular consent. */
  | 'waiting-wifi'
  | 'downloading'
  | 'extracting'
  | 'ready'
  | 'failed';

/**
 * Why a fetch failed, in the only terms the UI can act on differently.
 *
 * `disk-space` exists because the library throws `Insufficient disk space: …`
 * and the app rendered that as "Try again later" — advice that can never work,
 * since waiting does not free disk. It also must not auto-retry: a retry loop
 * against a full disk is pure battery burn.
 */
export type VoiceModelErrorKind = 'disk-space' | 'network' | 'unknown-model' | 'unknown';

export interface VoiceModelSnapshot {
  readonly state: VoiceModelState;
  /** 0..1, monotonic within an attempt. See PROGRESS_BANDS. */
  readonly progress: number;
  /** Non-null iff `state === 'ready'`. */
  readonly localPath: string | null;
  readonly error: string | null;
  readonly errorKind: VoiceModelErrorKind | null;
}

export type VoiceModelRequestReason = 'prefetch' | 'session' | 'user';

/**
 * Disjoint progress bands.
 *
 * The library emits `percent` 0→100 for `phase: 'downloading'` and then 0→100
 * again for `phase: 'extracting'`. Mapping both onto the same 0..1 made the bar
 * sweep twice and visibly reset — invisible on a Settings row nobody watches,
 * but a reset to 4% in the middle of a review session reads as a failure. The
 * last sliver is left for the engine warm-up so "100%" means usable, not
 * "downloaded but still 3 seconds from working".
 */
const PROGRESS_BANDS = {
  downloadStart: 0,
  downloadEnd: 0.9,
  extractEnd: 0.99,
} as const;

const INITIAL_SNAPSHOT: VoiceModelSnapshot = {
  state: 'unknown',
  progress: 0,
  localPath: null,
  error: null,
  errorKind: null,
};

/** `let` only so the test seam can start every suite from a clean store. */
let store = createExternalStore(INITIAL_SNAPSHOT);

/**
 * The dedupe. The sherpa library does NOT dedupe: two concurrent
 * `ensureModelByCategory` calls for the same id both write the same state file
 * and both create a download task with the same id against the same
 * destination, where the second silently overwrites the first in the native
 * task map. Prefetch and session-start can easily race, so every caller joins
 * one promise.
 */
let inFlight: Promise<VoiceModelSnapshot> | null = null;

/** Sticky for the app run once the learner accepts the cellular cost. */
let meteredAllowed = false;

/** Lazily attached, and only while something is actually waiting for Wi-Fi. */
let netInfoUnsubscribe: (() => void) | null = null;

/** Set once a `disk-space` failure is seen, so the Wi-Fi listener cannot retry into it. */
let blockedUntilExplicitRetry = false;

function emit(next: Partial<VoiceModelSnapshot>): void {
  store.update(current => ({ ...current, ...next }));
}

/** Stable reference between changes — a fresh object per call would spin `useSyncExternalStore`. */
export function getVoiceModelSnapshot(): VoiceModelSnapshot {
  return store.get();
}

export function subscribeVoiceModel(listener: () => void): () => void {
  return store.subscribe(listener);
}

/**
 * Unmetered means "the learner is not paying per byte".
 *
 * Checked through `isConnectionExpensive` rather than `type === 'wifi'` alone
 * because an iOS Personal Hotspot reports `wifi` while costing cellular data.
 * `details` is `null` on every disconnected state, so it can never be assumed.
 */
function isUnmetered(state: NetInfoState): boolean {
  if (!state.isConnected) return false;
  // Narrowing to the two connected wired/wireless states is also what makes
  // `details` non-null below — it is `null` on every disconnected state.
  if (state.type !== 'wifi' && state.type !== 'ethernet') return false;
  return !state.details.isConnectionExpensive;
}

function classifyError(error: unknown): VoiceModelErrorKind {
  const { message } = toError(error);
  if (/insufficient disk space/i.test(message)) return 'disk-space';
  if (/unknown model id/i.test(message)) return 'unknown-model';
  if (/network|timeout|econn|fetch|socket/i.test(message)) return 'network';
  return 'unknown';
}

/**
 * Keep 103 MB of re-downloadable data out of the learner's iCloud backup.
 *
 * The sherpa SDK writes into `Documents`, which iOS backs up by default. Apple's
 * Data Storage Guidelines treat backing up re-creatable data as grounds for
 * rejection, and it silently eats the user's iCloud quota. `mkdir` uses
 * `createDirectoryAtPath:withIntermediateDirectories:YES` and then sets the
 * resource value, so this is safe to call whether or not the directory exists —
 * but it must run before the SDK's own `mkdir`, hence the call site at the top
 * of every fetch. Best-effort: failing to set a backup flag must never stop a
 * download.
 */
async function excludeModelDirFromBackup(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await mkdir(`${DocumentDirectoryPath}/sherpa-onnx`, {
      NSURLIsExcludedFromBackupKey: true,
    });
  } catch {
    // A model that is backed up still works. Never block the fetch on this.
  }
}

function stopWaitingForWifi(): void {
  netInfoUnsubscribe?.();
  netInfoUnsubscribe = null;
}

/**
 * Retry the moment an unmetered connection appears, rather than only at the next
 * app launch. Attached lazily so a device that is always on Wi-Fi never holds a
 * listener at all.
 */
function waitForWifi(reason: VoiceModelRequestReason): void {
  if (netInfoUnsubscribe) return;
  netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (!isUnmetered(state)) return;
    if (blockedUntilExplicitRetry) return;
    stopWaitingForWifi();
    void requestVoiceModel({ reason });
  });
}

/**
 * Cheap presence check — a single `exists()` against the library's ready marker.
 * Safe to call on every launch and every foreground resume.
 */
export async function probeVoiceModel(): Promise<VoiceModelSnapshot> {
  try {
    const downloaded = await isModelDownloadedByCategory(ModelCategory.Stt, PARAKEET_MODEL_ID);
    if (!downloaded) {
      if (store.get().state === 'unknown') emit({ state: 'absent' });
      return store.get();
    }
    const localPath = await getLocalModelPathByCategory(ModelCategory.Stt, PARAKEET_MODEL_ID);
    if (localPath) {
      emit({ state: 'ready', progress: 1, localPath, error: null, errorKind: null });
    }
  } catch {
    // A failed probe means "still unknown", not "failed" — the fetch path is
    // what decides failure, and it reports a reason the UI can act on.
  }
  return store.get();
}

/**
 * Make the model present. Idempotent, deduped, and safe to call from anywhere.
 *
 * Resolves with the snapshot rather than throwing: every caller here is
 * best-effort background work, and the failure is already published to the store
 * where the UI reads it.
 */
export function requestVoiceModel(opts: {
  reason: VoiceModelRequestReason;
}): Promise<VoiceModelSnapshot> {
  if (inFlight) return inFlight;
  const current = store.get();
  if (current.state === 'ready') return Promise.resolve(current);

  const run = async (): Promise<VoiceModelSnapshot> => {
    const already = await probeVoiceModel();
    if (already.state === 'ready') return already;

    const net = await NetInfo.fetch();
    if (!meteredAllowed && !isUnmetered(net)) {
      emit({ state: 'waiting-wifi', error: null, errorKind: null });
      void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_PREFETCH_DEFERRED, {
        reason: net.isConnected ? 'metered' : 'offline',
        networkType: net.type,
        trigger: opts.reason,
      });
      waitForWifi(opts.reason);
      return store.get();
    }

    stopWaitingForWifi();
    blockedUntilExplicitRetry = false;
    await excludeModelDirFromBackup();

    emit({ state: 'downloading', progress: 0, error: null, errorKind: null });
    void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_PREFETCH_STARTED, {
      trigger: opts.reason,
      networkType: net.type,
      overMetered: meteredAllowed && !isUnmetered(net),
    });
    voiceBreadcrumb('voice.model.fetch.start', { trigger: opts.reason, networkType: net.type });

    const startedAt = Date.now();
    const onProgress = (progress: DownloadProgress): void => {
      const fraction = Math.max(0, Math.min(1, progress.percent / 100));
      const banded =
        progress.phase === 'extracting'
          ? PROGRESS_BANDS.downloadEnd +
            fraction * (PROGRESS_BANDS.extractEnd - PROGRESS_BANDS.downloadEnd)
          : PROGRESS_BANDS.downloadStart +
            fraction * (PROGRESS_BANDS.downloadEnd - PROGRESS_BANDS.downloadStart);
      const state = progress.phase === 'extracting' ? 'extracting' : 'downloading';
      // Every consumer renders a whole percentage. Native downloaders can emit
      // many callbacks inside that same visible percent; publishing each one
      // invalidates every useSyncExternalStore subscriber for no UI change.
      // Store the visible precision so snapshot identity also stays stable.
      const shown = store.get();
      const visibleProgress = Math.round(Math.max(shown.progress, banded) * 100) / 100;
      if (shown.state === state && shown.progress === visibleProgress) return;
      emit({
        state,
        // Monotonic: the two phases each count 0→100, and a bar that goes
        // backwards reads as a failure even when nothing is wrong.
        progress: visibleProgress,
      });
    };

    // NOTE: no `signal`. See the file header — passing one makes an unmount
    // destroy the download and its resume state.
    const ensureOpts = { deleteArchiveAfterExtract: true, onProgress };

    try {
      let model;
      try {
        model = await ensureModelByCategory(ModelCategory.Stt, PARAKEET_MODEL_ID, ensureOpts);
      } catch (first) {
        // The registry is read from an on-disk cache that is never populated on
        // a fresh install, so the FIRST ever fetch always reads a valid id as
        // "Unknown model id". Refresh from the GitHub release listing and retry
        // once. This is also the app's one hard external dependency.
        if (classifyError(first) !== 'unknown-model') throw first;
        await refreshModelsByCategory(ModelCategory.Stt);
        model = await ensureModelByCategory(ModelCategory.Stt, PARAKEET_MODEL_ID, ensureOpts);
      }

      emit({
        state: 'ready',
        progress: 1,
        localPath: model.localPath,
        error: null,
        errorKind: null,
      });
      voiceBreadcrumb('voice.model.fetch.ready', { durationMs: Date.now() - startedAt });
      return store.get();
    } catch (error) {
      const errorKind = classifyError(error);
      const { message } = toError(error);
      // A full disk is not a transient fault. Auto-retrying it burns battery
      // and can never succeed, so it waits for a deliberate tap.
      blockedUntilExplicitRetry = errorKind === 'disk-space';
      emit({ state: 'failed', error: message, errorKind });
      void analytics.track(ANALYTICS_EVENTS.VOICE_MODEL_FAILED, {
        modelId: PARAKEET_MODEL_ID,
        message,
        errorKind,
        trigger: opts.reason,
      });
      voiceBreadcrumb('voice.model.fetch.failed', { errorKind, message }, 'warning');
      if (!blockedUntilExplicitRetry) waitForWifi(opts.reason);
      return store.get();
    }
  };

  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * The cellular escape hatch, from the review screen's "Download over cellular".
 *
 * Deliberately does NOT touch the downloader's native `allowsCellularAccess`
 * config: on iOS mutating that recreates the URLSession and kills any in-flight
 * task. The Wi-Fi policy is entirely ours, enforced before the library is called.
 */
export function allowMeteredVoiceModelDownload(): Promise<VoiceModelSnapshot> {
  meteredAllowed = true;
  blockedUntilExplicitRetry = false;
  stopWaitingForWifi();
  return requestVoiceModel({ reason: 'user' });
}

/** Explicit retry after a failure the learner has had a chance to fix. */
export function retryVoiceModel(): Promise<VoiceModelSnapshot> {
  blockedUntilExplicitRetry = false;
  if (store.get().state === 'failed') emit({ state: 'absent', error: null, errorKind: null });
  return requestVoiceModel({ reason: 'user' });
}

/**
 * Reclaim the ~100 MB. Nothing else in the app deletes it, and with voice on by
 * default that would otherwise be permanent for every learner.
 */
export async function deleteVoiceModel(): Promise<void> {
  stopWaitingForWifi();
  await deleteModelByCategory(ModelCategory.Stt, PARAKEET_MODEL_ID);
  emit({ state: 'absent', progress: 0, localPath: null, error: null, errorKind: null });
}

/** Test seam — module state is deliberately process-wide, so suites must reset it. */
export function __resetVoiceModelStoreForTests(): void {
  stopWaitingForWifi();
  store = createExternalStore(INITIAL_SNAPSHOT);
  inFlight = null;
  meteredAllowed = false;
  blockedUntilExplicitRetry = false;
}
