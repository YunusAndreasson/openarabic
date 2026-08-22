/**
 * WHEN to fetch the voice model. The only place `voiceEnabled` is consulted
 * about downloads.
 *
 * The service (`services/voiceModelStore.ts`) is policy-free: it knows how to
 * make the bytes appear and refuses to do it on a metered connection, but it has
 * no opinion about whether they are wanted. That opinion lives here, and it is
 * read only to decide whether to START. Nothing in this hook can stop a fetch
 * that is already running — the whole point of the split is that a download
 * outlives the components that trigger it, so there is deliberately **no cleanup
 * function** on the effect below.
 *
 * MOUNT LOCATION MATTERS. This must stay inside `PersistGate`
 * (`app/_layout.tsx:692`), which `VoiceGradingProvider` is. Mounted above it,
 * `voiceEnabled` reads as its initial value before rehydration — now `true` —
 * and would start a 103 MB download for every learner who has ever turned voice
 * off.
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { probeVoiceModel, requestVoiceModel } from '@/services/voiceModelStore';

export function useVoiceModelPrefetch({ active }: { active: boolean }): void {
  useEffect(() => {
    if (!active) return;
    void requestVoiceModel({ reason: 'prefetch' });
    // No cleanup. See the file header — a cleanup here is what used to destroy
    // the download and its resume state.
  }, [active]);

  // A transfer can complete while the app is suspended (it is an OS background
  // task). On iOS the process can even be terminated first, in which case the
  // library's `done` handler never ran and our in-memory state still says
  // "downloading". Re-probing disk on resume is a single `exists()` call and is
  // the cheapest way to notice.
  useEffect(() => {
    if (!active) return;
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      void probeVoiceModel();
    });
    return () => {
      subscription.remove();
    };
  }, [active]);
}
