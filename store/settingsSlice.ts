import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { ReminderTime } from '@/types/notifications.types';


export interface SettingsState {
  fontScale: number;
  showEnglish: boolean;
  reminderTime: ReminderTime;
}

const initialState: SettingsState = {
  fontScale: 1,
  showEnglish: true,
  reminderTime: {
    hour: 19, // 7 PM default
    minute: 0,
    enabled: false,
  },
};


const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setReminderTime: (state, action: PayloadAction<ReminderTime>) => {
      state.reminderTime = action.payload;
    },
  },
});

export const {
  setReminderTime,
} = settingsSlice.actions;
export default settingsSlice.reducer;
