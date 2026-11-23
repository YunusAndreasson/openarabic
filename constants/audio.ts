/**
 * Audio player states
 */
export const AUDIO_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
} as const;

export const NORMAL_PLAYBACK_RATE = 1;
export const ARTICLE_PLAYBACK_RATES = [0.75, NORMAL_PLAYBACK_RATE, 1.25, 1.5] as const;
export type ArticlePlaybackRate = (typeof ARTICLE_PLAYBACK_RATES)[number];

export const resolveArticlePlaybackRate = (value: unknown): ArticlePlaybackRate =>
  ARTICLE_PLAYBACK_RATES.find(rate => rate === value) ?? NORMAL_PLAYBACK_RATE;
