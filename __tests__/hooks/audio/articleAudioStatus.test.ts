import { describe, expect, test } from '@jest/globals';

import { isArticleAudioActive, isArticleAudioPaused } from '@/hooks/audio/articleAudioStatus';
import type { AudioStatus } from '@/services/audioPlayer';
import type { ArticleId } from '@/types/branded.types';

const IDLE_STATUS: AudioStatus = {
  playing: false,
  currentTime: 0,
  duration: 0,
  currentTrack: null,
  isLoaded: true,
  isBuffering: false,
  playbackState: 'idle',
  timeControlStatus: 'paused',
  reasonForWaitingToPlay: '',
  didJustFinish: false,
  error: null,
};

const REVIEW_TRACK = {
  id: 'review-1',
  audioUrl: 'file:///review.mp3',
  title: 'Review Audio',
};

const ARTICLE_TRACK = {
  id: 'article-42',
  articleId: 42 as ArticleId,
  audioUrl: 'https://example.com/article.mp3',
  title: 'Article',
} as const;

describe('isArticleAudioActive', () => {
  test('stays false throughout review audio transport changes', () => {
    expect(
      isArticleAudioActive({ ...IDLE_STATUS, playing: true, currentTrack: REVIEW_TRACK }),
    ).toBe(false);
    expect(
      isArticleAudioActive({
        ...IDLE_STATUS,
        isLoaded: false,
        isBuffering: true,
        currentTrack: REVIEW_TRACK,
      }),
    ).toBe(false);
  });

  test('is true while an article track is playing, loading or paused', () => {
    expect(
      isArticleAudioActive({ ...IDLE_STATUS, playing: true, currentTrack: ARTICLE_TRACK }),
    ).toBe(true);
    expect(
      isArticleAudioActive({
        ...IDLE_STATUS,
        isLoaded: false,
        isBuffering: true,
        currentTrack: ARTICLE_TRACK,
      }),
    ).toBe(true);
    // Paused — by the listener, the lock screen or a phone call. The player
    // must stay up so the track can be resumed.
    expect(isArticleAudioActive({ ...IDLE_STATUS, currentTrack: ARTICLE_TRACK })).toBe(true);
  });

  test('is false once the track is gone or has ended', () => {
    expect(isArticleAudioActive(IDLE_STATUS)).toBe(false);
    expect(
      isArticleAudioActive({
        ...IDLE_STATUS,
        playbackState: 'ended',
        didJustFinish: true,
        currentTrack: ARTICLE_TRACK,
      }),
    ).toBe(false);
  });
});

describe('isArticleAudioPaused', () => {
  test('is true only for a loaded article track that is not playing', () => {
    expect(isArticleAudioPaused({ ...IDLE_STATUS, currentTrack: ARTICLE_TRACK })).toBe(true);
    expect(
      isArticleAudioPaused({ ...IDLE_STATUS, playing: true, currentTrack: ARTICLE_TRACK }),
    ).toBe(false);
    expect(
      isArticleAudioPaused({ ...IDLE_STATUS, isBuffering: true, currentTrack: ARTICLE_TRACK }),
    ).toBe(false);
    expect(isArticleAudioPaused({ ...IDLE_STATUS, currentTrack: REVIEW_TRACK })).toBe(false);
  });
});
