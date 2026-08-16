import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { addAlias } from '@/utils/voiceAliases';

/**
 * Transcripts the learner overruled the recognizer on, keyed by root id.
 *
 * Local and per-device on purpose. Replaying the telemetry showed ZERO overlap
 * between learners' accepted mishears — a shared list would have caught exactly
 * the same rows as a personal one — so this buys nothing by living in the
 * database, which is read-only for feature work anyway.
 *
 * What may go in here is decided by `utils/voiceAliases`, not by this slice.
 */
export interface VoiceAliasesState {
  /** root id (as an object key) → normalized transcripts, newest last. */
  byRoot: Record<string, string[]>;
}

const initialState: VoiceAliasesState = {
  byRoot: {},
};

const voiceAliasesSlice = createSlice({
  name: 'voiceAliases',
  initialState,
  reducers: {
    /**
     * Remember a transcript for a word. Callers must have cleared
     * `isAliasStorable` first — this only de-duplicates and caps.
     */
    rememberAlias: (state, action: PayloadAction<{ rootId: number; transcript: string }>) => {
      const { rootId, transcript } = action.payload;
      const key = String(rootId);
      const existing = state.byRoot[key] ?? [];
      const next = addAlias(existing, transcript);
      if (next !== existing) state.byRoot[key] = [...next];
    },
    /** Escape hatch for a word that has learned something wrong. */
    forgetAliases: (state, action: PayloadAction<number>) => {
      const key = String(action.payload);
      state.byRoot = Object.fromEntries(
        Object.entries(state.byRoot).filter(([rootId]) => rootId !== key),
      );
    },
    clearAllAliases: state => {
      state.byRoot = {};
    },
  },
});

export const { rememberAlias, forgetAliases, clearAllAliases } = voiceAliasesSlice.actions;

export default voiceAliasesSlice.reducer;
