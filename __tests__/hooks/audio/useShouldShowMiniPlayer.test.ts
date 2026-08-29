import { describe, expect, jest, test } from '@jest/globals';

jest.unmock('@/hooks/audio/useShouldShowMiniPlayer');

import { isArticleAudioActive } from '@/hooks/audio/useShouldShowMiniPlayer';
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

describe('isArticleAudioActive', () => {
  test('stays false throughout review audio transport changes', () => {
    expect(
      isArticleAudioActive({
        ...IDLE_STATUS,
        playing: true,
        currentTrack: {
          id: 'review-1',
          audioUrl: 'file:///review.mp3',
          title: 'Review Audio',
        },
      }),
    ).toBe(false);

    expect(
      isArticleAudioActive({
        ...IDLE_STATUS,
        isLoaded: false,
        isBuffering: true,
        currentTrack: {
          id: 'review-1',
          audioUrl: 'file:///review.mp3',
          title: 'Review Audio',
        },
      }),
    ).toBe(false);
  });

  test('is true while article audio is playing or loading', () => {
    const currentTrack = {
      id: 'article-42',
      articleId: 42 as ArticleId,
      audioUrl: 'https://example.com/article.mp3',
      title: 'Article',
    } as const;

    expect(isArticleAudioActive({ ...IDLE_STATUS, playing: true, currentTrack })).toBe(true);
    expect(
      isArticleAudioActive({
        ...IDLE_STATUS,
        isLoaded: false,
        isBuffering: true,
        currentTrack,
      }),
    ).toBe(true);
    expect(isArticleAudioActive({ ...IDLE_STATUS, currentTrack })).toBe(false);
  });
});
