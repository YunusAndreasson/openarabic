import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as ExecuTorch from 'react-native-executorch';

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
 * **The task runner is built directly rather than through the library's
 * `useVoiceActivityDetector` hook.** That hook starts its download the moment it
 * mounts, and this one is mounted by `VoiceGradingProvider` for the whole app —
 * a learner who has voice switched off should not fetch a model they will never
 * run.
 */

/**
 * Downloads the model if it is not cached and builds a detector over it.
 *
 * The library is required here and not imported at the top of the file because
 * its entry point throws when the executorch JSI bindings are missing from the
 * binary. A static import would take `VoiceGradingProvider`, and with it the
 * whole app, down on such a build; from here the same failure is a rejected
 * load and the recorder stays on the energy gate. `require` rather than
 * `import()`: Metro inlines both, but Jest cannot run a dynamic import at all.
 *
 * The download is ~1.8 MB and deliberately does NOT go through the
 * metered-connection gate the Parakeet model uses. That gate exists because
 * Parakeet is ~103 MB — a real decision to put in front of someone on cellular —
 * and asking the same question about a file two per cent of its size would be
 * ceremony rather than consent.
 */
async function loadDetector(signal: AbortSignal): Promise<ExecuTorch.FsmnVoiceActivityDetector> {
  const { createFsmnVoiceActivityDetector, download, models } =
    require('react-native-executorch') as typeof ExecuTorch;
  const model = await download(models.voiceActivityDetection.FSMN_VAD.DEFAULT, { signal });
  return createFsmnVoiceActivityDetector(model);
}

/**
 * How close to the end of the rolling window the last speech segment has to
 * reach for the learner to still count as speaking.
 *
 * Left at the library default (100 ms) deliberately. It is part of the reason
 * the recorder pads a VAD-driven window with a wider pre-roll — the verdict can
 * trail the syllable that caused it — and moving it is a change to answer
 * latency that should be made against captured audio, not guessed at here.
 */
const STREAM_OPTIONS = { detectionMargin: 100 } as const;

type GateHandlers = Parameters<SpeechGate['start']>[0];

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
  const detectorRef = useRef<ExecuTorch.FsmnVoiceActivityDetector | null>(null);
  const handlersRef = useRef<GateHandlers | null>(null);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    loadDetector(controller.signal)
      .then(detector => {
        if (!active) {
          detector.dispose();
          return;
        }
        detectorRef.current = detector;
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
      controller.abort();
      setLoaded(false);
      handlersRef.current = null;
      detectorRef.current?.dispose();
      detectorRef.current = null;
    };
  }, [enabled]);

  const start = useCallback((handlers: GateHandlers): void => {
    const detector = detectorRef.current;
    if (!detector) throw new Error('VAD not loaded');
    // A window torn down without a clean stop (an unmount mid-answer, a
    // cancelled arm) would otherwise leave its audio in the rolling window and
    // its speaking state set, and this one would open already "speaking".
    detector.resetStream();
    handlersRef.current = handlers;
  }, []);

  const insert = useCallback((waveform: Float32Array): void => {
    const detector = detectorRef.current;
    if (!detector) throw new Error('VAD not loaded');
    // Detection runs right here, on the buffer in hand, and anything it throws
    // is the contract: `VoiceCaptureSession` catches it and hands the rest of
    // the window to the energy gate.
    const event = detector.detectVoiceOnStream(waveform, STREAM_OPTIONS);
    if (event === 'speechStart') handlersRef.current?.onSpeechBegin();
    else if (event === 'speechEnd') handlersRef.current?.onSpeechEnd();
  }, []);

  const stop = useCallback((): void => {
    handlersRef.current = null;
    detectorRef.current?.resetStream();
  }, []);

  const isReady = isLoaded && enabled;
  const gate = useMemo<SpeechGate>(
    () => ({ isReady, start, insert, stop }),
    [isReady, start, insert, stop],
  );

  return { gate, isReady };
}
