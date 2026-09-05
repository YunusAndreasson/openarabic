import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  VADModule,
  initExecutorch,
  isAvailable as executorchAvailable,
  models,
} from 'react-native-executorch';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';

import type { SpeechGate } from '@/lib/voice/recording';
import { voiceBreadcrumb } from '@/utils/errorHandling';
import { mark as diagMark } from '@/utils/reviewDiagnostics';

/**
 * The detector behind "is the learner speaking yet" — **FSMN VAD**, ~1.8 MB,
 * running on executorch/XNNPACK.
 *
 * It exists because the microphone now opens by itself. A dB gate asks how loud
 * a buffer is, which is a fair question for a window the learner opened with a
 * tap ("I am about to speak") and the wrong one for a window that stands open
 * through the whole pause while they remember the word. Over those seconds a
 * television, a passing conversation or music clears 12 dB over room tone
 * easily, and the cost of a false onset here is not a cosmetic flicker: the
 * window closes on 900 ms of quiet, an empty transcript is graded, and the card
 * takes a mark the learner never earned. Asking *is this a voice* instead is the
 * thing that makes an unattended microphone safe.
 *
 * The energy gate is not replaced. It stays as the fallback the recorder falls
 * back to on its own (`RecordingConfig.speechGate`, `RecordingResult.gateUsed`)
 * and covers everything this cannot: the first session before the download
 * lands, devices without executorch, and any capture the OS hands back at a rate
 * other than the model's 16 kHz.
 *
 * **`VADModule` is driven directly rather than through the library's `useVAD`
 * hook.** That hook routes every call through `runForward`, which refuses a
 * second call while one is in flight — and `stream()` is in flight for the whole
 * session, so the `streamInsert` calls feeding it would race its own guard. The
 * module underneath has no such guard.
 */
const FSMN_VAD = models.vad.fsmn_vad();

/**
 * executorch has no default way to fetch a model — it throws until an adapter is
 * registered — so this hands it the Expo one (expo-file-system + expo-asset).
 *
 * Registered lazily, from the load effect, rather than at import: this module is
 * pulled in by `VoiceGradingProvider`, which mounts for the whole app, and a
 * learner who has voice switched off should not pay for a file-system adapter
 * they will never use.
 *
 * The download itself is ~1.8 MB and deliberately does NOT go through the
 * metered-connection gate the Parakeet model uses. That gate exists because
 * Parakeet is ~103 MB — a real decision to put in front of someone on cellular —
 * and asking the same question about a file two per cent of its size would be
 * ceremony rather than consent.
 */
let fetcherRegistered = false;
function registerResourceFetcher(): void {
  if (fetcherRegistered) return;
  initExecutorch({ resourceFetcher: ExpoResourceFetcher });
  fetcherRegistered = true;
}

/**
 * How long the native side waits between inferences, and how far apart two
 * detections may be and still count as one run of speech.
 *
 * Both left at the library defaults (100 ms) deliberately. They are the reason
 * the recorder pads a VAD-driven window with a wider pre-roll — the verdict can
 * trail the syllable that caused it — and moving them is a change to answer
 * latency that should be made against captured audio, not guessed at here.
 */
const STREAM_OPTIONS = { timeout: 100, detectionMargin: 100 } as const;

export interface SpeechGateState {
  /** Handed to the recorder's `beginWindow`; inert until `isReady`. */
  gate: SpeechGate;
  isReady: boolean;
}

/**
 * Deliberately no `downloadProgress` or `error` on that interface.
 *
 * Both were returned and consumed by nobody, which is worse than absent: they
 * read as a reporting surface that does not exist. Nothing waits on this model
 * — a window that opens before it lands runs on the energy gate — so there is
 * no progress the learner is blocked by, and a load failure is answered where
 * it actually matters: `RecordingResult.gateUsed` on every attempt row says
 * which detector really decided, and the failure itself leaves a
 * `voice.vad.loadFailed` breadcrumb. If the Advanced screen ever grows a VAD
 * status row beside Parakeet's, put them back then.
 */

export function useSpeechGate({ enabled }: { enabled: boolean }): SpeechGateState {
  const moduleRef = useRef<VADModule | null>(null);
  /**
   * Set when the streaming session dies after `start` has already returned.
   * The recorder can only learn about that through `insert`, so the flag is
   * turned into a throw there rather than being logged and forgotten — a
   * silent no-op would leave the window running to its cap with the model
   * saying nothing, which is indistinguishable from a learner who never spoke.
   */
  const brokenRef = useRef(false);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !executorchAvailable) return;
    let active = true;
    registerResourceFetcher();
    VADModule.fromModelName(FSMN_VAD)
      .then(instance => {
        if (!active) {
          instance.delete();
          return;
        }
        moduleRef.current = instance;
        setLoaded(true);
        diagMark('vad.loaded');
      })
      .catch((err: unknown) => {
        // A missing VAD is not a broken app — the recorder runs on the energy
        // gate — so this never reaches the learner. It is here because "which
        // gate ran" is only answerable from telemetry, and a model that never
        // loads would otherwise look identical to one that loaded and disagreed.
        if (!active) return;
        const message = err instanceof Error ? err.message : String(err);
        voiceBreadcrumb('voice.vad.loadFailed', { message }, 'warning');
      });
    return () => {
      active = false;
      setLoaded(false);
      moduleRef.current?.delete();
      moduleRef.current = null;
    };
  }, [enabled]);

  const start = useCallback(
    (handlers: { onSpeechBegin: () => void; onSpeechEnd: () => void }): void => {
      const instance = moduleRef.current;
      if (!instance) throw new Error('VAD not loaded');
      brokenRef.current = false;
      // A window torn down without a clean stop (an unmount mid-answer, a
      // cancelled arm) would otherwise leave its session running and swallow
      // this one's audio.
      try {
        instance.streamStop();
      } catch {
        // No session to stop — the normal case.
      }
      // `stream()` settles only when the session STOPS, so it cannot be awaited
      // here — this returns before the session is provably live, and anything
      // that goes wrong arrives after the recorder has already committed to the
      // VAD. Either way the gate is marked broken so the next `insert` throws
      // and the window falls back to the energy gate mid-take.
      //
      // **A clean resolve is treated exactly like a rejection, and that is the
      // point.** Watching only `.catch` reads "the session ended" as "the
      // session is fine": inserts keep succeeding as no-ops, `vadSpeaking`
      // freezes at whatever it last was, and the recorder never learns to fall
      // back — so a hands-free window burns its full 25 s and is discarded as
      // "nobody spoke". The learner spoke, waited, and is told nothing. A
      // resolve here can only mean the session is over, and after the window's
      // own `stop()` nothing inserts again, so this cannot misfire on the
      // normal teardown path.
      void instance
        .stream({ ...handlers, options: STREAM_OPTIONS })
        .then(() => {
          brokenRef.current = true;
        })
        .catch((err: unknown) => {
          brokenRef.current = true;
          voiceBreadcrumb(
            'voice.vad.streamFailed',
            { message: err instanceof Error ? err.message : String(err) },
            'warning',
          );
        });
    },
    [],
  );

  const insert = useCallback((waveform: Float32Array): void => {
    // Throwing is the contract: `VoiceCaptureSession` catches it and hands the
    // rest of the window to the energy gate.
    if (brokenRef.current) throw new Error('VAD stream failed');
    const instance = moduleRef.current;
    if (!instance) throw new Error('VAD not loaded');
    instance.streamInsert(waveform);
  }, []);

  const stop = useCallback((): void => {
    try {
      moduleRef.current?.streamStop();
    } catch {
      // Already stopped.
    }
  }, []);

  const isReady = isLoaded && enabled && executorchAvailable;
  const gate = useMemo<SpeechGate>(
    () => ({ isReady, start, insert, stop }),
    [isReady, start, insert, stop],
  );

  return { gate, isReady };
}
