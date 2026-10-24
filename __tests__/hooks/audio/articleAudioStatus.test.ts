import { describe, expect, test } from '@jest/globals';

import {
  isArticleAudioActive,
  isArticleAudioPaused,
  isAudioLoading,
  nowPlayingArticleId,
} from '@/hooks/audio/articleAudioStatus';
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
  queue: null,
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

describe('isAudioLoading', () => {
  test('is true while any track opens its source or buffers', () => {
    expect(isAudioLoading({ ...IDLE_STATUS, isLoaded: false, currentTrack: REVIEW_TRACK })).toBe(
      true,
    );
    expect(isAudioLoading({ ...IDLE_STATUS, isBuffering: true, currentTrack: ARTICLE_TRACK })).toBe(
      true,
    );
    expect(isAudioLoading({ ...IDLE_STATUS, currentTrack: ARTICLE_TRACK })).toBe(false);
  });

  test('an idle service is not loading, whatever isLoaded says', () => {
    // A fresh service reports isLoaded: false; reading that as loading would
    // block the very first play attempt.
    expect(isAudioLoading({ ...IDLE_STATUS, isLoaded: false })).toBe(false);
  });
});

describe('nowPlayingArticleId', () => {
  test('is the article the player is on, playing or paused, keeping its brand', () => {
    expect(
      nowPlayingArticleId({ ...IDLE_STATUS, playing: true, currentTrack: ARTICLE_TRACK }),
    ).toBe(ARTICLE_TRACK.articleId);
    expect(nowPlayingArticleId({ ...IDLE_STATUS, currentTrack: ARTICLE_TRACK })).toBe(42);
  });

  test('is null for review audio, an ended track or an idle player', () => {
    expect(
      nowPlayingArticleId({ ...IDLE_STATUS, playing: true, currentTrack: REVIEW_TRACK }),
    ).toBeNull();
    expect(
      nowPlayingArticleId({
        ...IDLE_STATUS,
        playbackState: 'ended',
        currentTrack: ARTICLE_TRACK,
      }),
    ).toBeNull();
    expect(nowPlayingArticleId(IDLE_STATUS)).toBeNull();
  });
});
