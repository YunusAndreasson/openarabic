/**
 * Query factories: what each shares, and with whom.
 */

jest.unmock('@tanstack/react-query');

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryObserver, skipToken } from '@tanstack/react-query';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import {
  audioQueries,
  estimateDueWordsFromCache,
  featuredQueries,
  fsrsQueries,
  readingProgressQueries,
  skipUnless,
  studyStreakQueries,
} from '@/constants/queries';
import { bookmarkService } from '@/services/bookmark';
import { StudySessionStreakService } from '@/services/studyStreak';
import type { BookmarkItem } from '@/types/bookmark.types';
import { MILLISECONDS_PER_HOUR } from '@/utils/dateTimeUtils';

jest.mock('@/services/bookmark', () => ({
  bookmarkService: { getReadingList: jest.fn() },
}));
jest.mock('@/services/audioCache', () => ({
  audioCache: { getCachedPath: async () => null },
}));
jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: (bucket: string, path: string) => `https://storage/${bucket}/${path}`,
}));
jest.mock('@/services/studyStreak', () => ({
  ...jest.requireActual<typeof import('@/services/studyStreak')>('@/services/studyStreak'),
  StudySessionStreakService: { fetchStudyDayKeys: jest.fn() },
}));

const USER = 'user-1';

const savedArticle = (id: number) =>
  ({
    user_id: USER,
    article_id: id,
    added_at: '2026-10-01T00:00:00Z',
    articles: {
      title: `Article ${id}`,
      audio_url: `audio-${id}.mp3`,
      audio_url_bilingual: null,
      image_url: `image-${id}.jpg`,
      author: { id: 1, name: 'Author' },
      category: { id: 1, name: 'Category' },
      article_sentences: [],
    },
  }) as unknown as BookmarkItem;

describe('query factories', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  });

  afterEach(() => {
    client.clear();
  });

  // The tracks were built from a second download of the reading list.
  describe('audioQueries.tracks', () => {
    test("builds the tracks from the reading list's own cache entry", async () => {
      client.setQueryData(readingProgressQueries.readingList(USER).queryKey, [
        savedArticle(1),
        savedArticle(2),
      ]);

      const tracks = await client.query(audioQueries.tracks(USER, 'arabic'));

      expect(bookmarkService.getReadingList).not.toHaveBeenCalled();
      expect(tracks.map(track => track.articleId)).toEqual([1, 2]);
    });

    test('fetches the reading list once when it is not cached, for both queries', async () => {
      jest.mocked(bookmarkService.getReadingList).mockResolvedValue([savedArticle(3)]);

      await client.query(audioQueries.tracks(USER, 'bilingual'));

      expect(bookmarkService.getReadingList).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(readingProgressQueries.readingList(USER).queryKey)).toHaveLength(
        1,
      );
    });
  });

  // The streak and its history each ran the full paged scan.
  describe('studyStreakQueries', () => {
    test('the streak and the history share one study-days entry and one scan', async () => {
      const today = new Date();
      const key = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
      jest.mocked(StudySessionStreakService.fetchStudyDayKeys).mockResolvedValue(new Set([key]));

      const streak = await client.query(studyStreakQueries.streak(USER));
      const history = await client.query(studyStreakQueries.history(USER, 7));

      expect(StudySessionStreakService.fetchStudyDayKeys).toHaveBeenCalledTimes(1);
      expect(streak.currentStreak).toBe(1);
      expect(history.dailyActivity).toHaveLength(7);
      expect(history.metrics.currentStreak).toBe(1);
      expect(studyStreakQueries.streak(USER).queryKey).toEqual(
        studyStreakQueries.history(USER, 40).queryKey,
      );
    });

    test('one invalidation refreshes both', async () => {
      jest.mocked(StudySessionStreakService.fetchStudyDayKeys).mockResolvedValue(new Set());
      const observer = new QueryObserver(client, studyStreakQueries.streak(USER));
      const unsubscribe = observer.subscribe(() => undefined);
      await client.query(studyStreakQueries.streak(USER));
      jest.mocked(StudySessionStreakService.fetchStudyDayKeys).mockClear();

      await studyStreakQueries.invalidateAll(client, USER);

      expect(StudySessionStreakService.fetchStudyDayKeys).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe('estimateDueWordsFromCache', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    const dueWord = createTestWord({
      root_id: rootId(1),
      fsrs_state: 2,
      fsrs_due: '2026-10-24T11:00:00Z',
      fsrs_last_review: '2026-10-24T11:30:00Z',
    });

    test('is undefined while the word list is not cached', () => {
      expect(estimateDueWordsFromCache(client, USER, now)).toBeUndefined();
    });

    test('derives the due list from the cached words, cooldown included', () => {
      client.setQueryData(fsrsQueries.all(USER).queryKey, [dueWord]);
      expect(estimateDueWordsFromCache(client, USER, now)).toEqual([dueWord]);

      // A session just finished: a Review word reviewed inside the cooldown
      // window waits for the next one.
      client.setQueryData(fsrsQueries.lastCompletedAtKey(USER), now - MILLISECONDS_PER_HOUR / 2);
      expect(estimateDueWordsFromCache(client, USER, now)).toEqual([]);

      client.setQueryData(
        fsrsQueries.lastCompletedAtKey(USER),
        now - (DEFAULT_SESSION_COOLDOWN_HOURS + 1) * MILLISECONDS_PER_HOUR,
      );
      expect(estimateDueWordsFromCache(client, USER, now)).toEqual([dueWord]);
    });
  });

  describe('client-only keys', () => {
    test('the session-completion stamp lives under the user’s fsrs-words prefix', () => {
      expect(fsrsQueries.lastCompletedAtKey(USER)).toEqual(['fsrs-words', USER, 'lastCompletedAt']);
    });

    test('a featured pick is keyed by scope, refresh and app session', () => {
      const [name, scope, refreshKey, session] = featuredQueries.selection('global', 0).queryKey;

      expect([name, scope, refreshKey]).toEqual(['featured-articles', 'global', 0]);
      expect(typeof session).toBe('number');
    });
  });

  describe('skipUnless', () => {
    test('withholds only the fetch, keeping the key', () => {
      const config = readingProgressQueries.readingList(USER);

      expect(skipUnless(true, config)).toBe(config);
      expect(skipUnless(false, config)).toEqual({ ...config, queryFn: skipToken });
    });
  });
});
