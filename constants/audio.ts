/**
 * Audio player states
 */
export const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

export type AudioState = (typeof AUDIO_STATES)[keyof typeof AUDIO_STATES];
