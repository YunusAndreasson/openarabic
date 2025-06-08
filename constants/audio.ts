/**
 * Audio player states
 */
export const AUDIO_STATES = {
  IDLE: 'idle', // Not playing anything
  LOADING: 'loading', // Loading audio
  PLAYING: 'playing', // Playing audio
  PAUSED: 'paused', // Audio loaded but paused
  ERROR: 'error', // Error occurred
} as const;

export type AudioState = (typeof AUDIO_STATES)[keyof typeof AUDIO_STATES];
