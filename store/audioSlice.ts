import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AudioState {
  currentWordId: number | null;
  currentPosition: number | null;
  isPlaying: boolean;
  currentSentenceId: number | null;
}

const initialState: AudioState = {
  currentWordId: null,
  currentPosition: null,
  isPlaying: false,
  currentSentenceId: null,
};

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setCurrentWord: (
      state,
      action: PayloadAction<{
        wordId: number | null;
        position: number | null;
      }>
    ) => {
      state.currentWordId = action.payload.wordId;
      state.currentPosition = action.payload.position;
    },
    setPlayingState: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setCurrentSentence: (state, action: PayloadAction<number | null>) => {
      state.currentSentenceId = action.payload;
    },
    resetAudioState: state => {
      state.currentWordId = null;
      state.currentPosition = null;
      state.isPlaying = false;
      state.currentSentenceId = null;
    },
    updateAudioState: (
      state,
      action: PayloadAction<{
        wordId?: number | null;
        position?: number | null;
        isPlaying?: boolean;
        sentenceId?: number | null;
      }>
    ) => {
      if (action.payload.wordId !== undefined) {
        state.currentWordId = action.payload.wordId;
      }
      if (action.payload.position !== undefined) {
        state.currentPosition = action.payload.position;
      }
      if (action.payload.isPlaying !== undefined) {
        state.isPlaying = action.payload.isPlaying;
      }
      if (action.payload.sentenceId !== undefined) {
        state.currentSentenceId = action.payload.sentenceId;
      }
    },
  },
});

export const {
  setCurrentWord,
  setPlayingState,
  setCurrentSentence,
  resetAudioState,
  updateAudioState,
} = audioSlice.actions;
export default audioSlice.reducer;
