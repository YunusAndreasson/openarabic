/**
 * Audio player states
 */
export const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

export type AudioState = (typeof AUDIO_STATES)[keyof typeof AUDIO_STATES];

/**
 * Preset timer options for the sleep timer in minutes
 */
export const SLEEP_TIMER_MINUTES = [5, 10, 15, 30, 45, 60] as const;
