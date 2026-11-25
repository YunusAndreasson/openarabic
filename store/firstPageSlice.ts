import { createSlice } from '@reduxjs/toolkit';

/** Installation-scoped reading state. Never store a study word or auth attempt here. */
const firstPage = createSlice({
  name: 'firstPage',
  initialState: {
    version: 1,
    shown: false,
    guided: false,
    hasSaved: false,
    returningInstall: false,
  },
  reducers: {
    wordSaveConfirmed(state) {
      state.hasSaved = true;
    },
    pageShown(state) {
      state.shown = true;
      if (!state.returningInstall) state.guided = true;
    },
    markReturningInstall(state) {
      state.returningInstall = true;
    },
  },
});

export const { wordSaveConfirmed, pageShown, markReturningInstall } = firstPage.actions;
export default firstPage.reducer;
