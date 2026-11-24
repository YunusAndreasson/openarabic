import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Installation-scoped reading state. Never store a study word or auth attempt here. */
const firstPage = createSlice({
  name: 'firstPage',
  initialState: {
    version: 1,
    shown: false,
    guided: false,
    hasSaved: false,
    firstLineSeen: false,
    tipHidden: false,
    browsed: false,
    returningInstall: false,
    offset: 0,
  },
  reducers: {
    wordSaveConfirmed(state) {
      state.hasSaved = true;
    },
    pageShown(state) {
      state.shown = true;
      if (!state.returningInstall) state.guided = true;
    },
    firstLineSeen(state) {
      state.firstLineSeen = true;
    },
    hideReaderTip(state) {
      state.tipHidden = true;
    },
    markReturningInstall(state) {
      state.returningInstall = true;
    },
    browseTexts(state) {
      state.browsed = true;
      state.tipHidden = true;
    },
    saveReaderOffset(state, action: PayloadAction<number>) {
      if (Number.isFinite(action.payload)) state.offset = Math.max(0, action.payload);
    },
  },
});

export const {
  wordSaveConfirmed,
  pageShown,
  firstLineSeen,
  hideReaderTip,
  browseTexts,
  markReturningInstall,
  saveReaderOffset,
} = firstPage.actions;
export default firstPage.reducer;
