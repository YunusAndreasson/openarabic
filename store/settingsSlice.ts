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

// Migration function to handle old state without reminderTime
const migrateSettingsState = (state: any): SettingsState => {
  if (!state) return initialState;

  return {
    fontScale: state.fontScale ?? initialState.fontScale,
    showEnglish: state.showEnglish ?? initialState.showEnglish,
    reminderTime: state.reminderTime ?? initialState.reminderTime,
  };
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setFontScale: (state, action: PayloadAction<number>) => {
      state.fontScale = action.payload;
    },
    setShowEnglish: (state, action: PayloadAction<boolean>) => {
      state.showEnglish = action.payload;
    },
    setReminderTime: (state, action: PayloadAction<ReminderTime>) => {
      state.reminderTime = action.payload;
    },
    setReminderEnabled: (state, action: PayloadAction<boolean>) => {
      state.reminderTime.enabled = action.payload;
    },
    // Migration action to handle old state
    migrateSettings: (state, action: PayloadAction<any>) => {
      const migratedState = migrateSettingsState(action.payload);
      state.fontScale = migratedState.fontScale;
      state.showEnglish = migratedState.showEnglish;
      state.reminderTime = migratedState.reminderTime;
    },
  },
});

export const {
  setFontScale,
  setShowEnglish,
  setReminderTime,
  setReminderEnabled,
  migrateSettings,
} = settingsSlice.actions;
export default settingsSlice.reducer;
