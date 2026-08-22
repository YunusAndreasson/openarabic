/**
 * Read surface for the voice model's on-disk state.
 *
 * `useSyncExternalStore` is mandatory here, not stylistic. The React Compiler
 * treats a module getter called during render as pure and caches it for the
 * component's lifetime — even inside a `useMemo` with an explicit version
 * dependency — which is exactly how the review diagnostics HUD once froze on its
 * first empty values (see `ReviewDiagSnapshot`). A progress readout that freezes
 * at "Preparing voice… 0%" is the same bug wearing different copy.
 */
import { useSyncExternalStore } from 'react';

import {
  getVoiceModelSnapshot,
  subscribeVoiceModel,
  type VoiceModelSnapshot,
} from '@/services/voiceModelStore';

export function useVoiceModel(): VoiceModelSnapshot {
  return useSyncExternalStore(subscribeVoiceModel, getVoiceModelSnapshot, getVoiceModelSnapshot);
}
