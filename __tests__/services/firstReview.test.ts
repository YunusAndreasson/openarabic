import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { beforeEach, expect, jest, test } from '@jest/globals';
import { TutorialId } from '@/constants/tutorials';
import { loadAllTutorialStates } from '@/utils/tutorialStorage';
import { recordStudyDay } from '@/utils/studyDayLedger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import {
  chooseFirstGrade,
  confirmFirstGrade,
  leaveFirstReview,
  prepareFirstReview,
  resumeFirstReview,
  revealFirstReview,
  startFirstReview,
} from '@/services/firstReview';
import { loadFirstReviewCard, sendFirstReview } from '@/services/firstReviewRpc';
import type { ReaderSave } from '@/services/readerSave';
import type { RootId } from '@/types/branded.types';

jest.mock('@/services/firstReviewRpc', () => ({
  loadFirstReviewCard: jest.fn(),
  sendFirstReview: jest.fn(),
}));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/installAttribution', () => ({ trackActivated: jest.fn() }));
jest.mock('@/utils/notificationPromptStorage', () => ({ recordSessionCompleted: jest.fn() }));
jest.mock('@/utils/studyDayLedger', () => ({ recordStudyDay: jest.fn() }));
jest.mock('@/utils/recallSignalStorage', () => ({ appendSession: jest.fn() }));

const root = 18276 as RootId;
const save: ReaderSave = {
  id: 'save',
  owner: 'user',
  phase: 'saved',
  method: 'sheet',
  version: 1,
  word: {
    source: 'first_run_reader',
    occurrenceId: 59291,
    rootId: root,
    form: 'كَنْزٍ',
    gloss: 'a treasure',
  },
};
const confirmed = {
  status: 'confirmed' as const,
  complete: true,
  replayed: false,
  due: '2026-11-23T10:00:00Z',
  revision: 'after',
  reviewed: '2026-11-23T09:00:00Z',
};
const setup = async () => revealFirstReview(await prepareFirstReview(await startFirstReview(save)));
beforeEach(async () => {
  mockReviewStorage();
  jest.clearAllMocks();
  jest.mocked(loadFirstReviewCard).mockResolvedValue({
    letters: 'كَنْزٍ',
    meaning: 'a treasure',
    sentence: 'عَلَى كَنْزٍ',
    translation: 'upon a treasure',
    revision: null,
    row: createTestWord({ root_id: root }),
  });
});
test('a lost response keeps the original grade, time, owner and revision across exit and retry', async () => {
  const review = await setup();
  const write = jest
    .mocked(sendFirstReview)
    .mockRejectedValueOnce(new Error('response lost'))
    .mockResolvedValueOnce({ ...confirmed, replayed: true });
  const failed = await chooseFirstGrade(review, 'known');
  expect(failed.step).toBe('error');
  expect(analytics.track).not.toHaveBeenCalledWith(
    ANALYTICS_EVENTS.REVIEW_WORD_GRADED,
    expect.anything(),
  );
  await leaveFirstReview(failed);
  expect(await resumeFirstReview('other', root)).toBeUndefined();
  const restored = (await resumeFirstReview('user', root))!;
  expect(restored.attempt).toEqual(failed.attempt);
  expect(await confirmFirstGrade(restored)).toMatchObject({ step: 'complete', due: confirmed.due });
  expect(write.mock.calls[0]?.[2]).toEqual(write.mock.calls[1]?.[2]);
  expect(write.mock.calls[0]?.[0]).toMatchObject({ step: 'writing', owner: 'user' });
  expect((await resumeFirstReview('user', root))?.step).toBe('complete');
  for (const event of [
    ANALYTICS_EVENTS.REVIEW_WORD_GRADED,
    ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE,
  ]) {
    expect(jest.mocked(analytics.track).mock.calls.filter(([name]) => name === event)).toHaveLength(
      1,
    );
  }
});
test('a forgotten word remains in restudy until its write is confirmed, then returns to recall', async () => {
  const review = await setup();
  const restudy = await chooseFirstGrade(review, 'unknown');
  expect(restudy.step).toBe('restudy');
  expect(sendFirstReview).not.toHaveBeenCalled();
  jest.mocked(sendFirstReview).mockResolvedValueOnce({ ...confirmed, complete: false });
  const again = await confirmFirstGrade(restudy);
  expect(again).toMatchObject({ step: 'recall', previous: restudy.attempt!.id });
  expect(again.card?.revision).toBe('after');
  expect(analytics.track).not.toHaveBeenCalledWith(
    ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE,
    expect.anything(),
  );
});
test('a competing review requires a fresh card and a new deliberate grade', async () => {
  const review = await setup();
  jest.mocked(sendFirstReview).mockResolvedValueOnce({ status: 'conflict' });
  const conflict = await chooseFirstGrade(review, 'vague');
  expect(conflict).toMatchObject({ step: 'conflict', attempt: undefined });
  expect((await prepareFirstReview(conflict)).step).toBe('recall');
  expect(loadFirstReviewCard).toHaveBeenCalledTimes(2);
  expect(sendFirstReview).toHaveBeenCalledTimes(1);
});
test('double grade and a failed journal write cannot send a second or unrecorded grade', async () => {
  const review = await setup();
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
  await expect(chooseFirstGrade(review, 'known')).rejects.toThrow('disk full');
  expect(sendFirstReview).not.toHaveBeenCalled();
  jest.mocked(sendFirstReview).mockResolvedValue(confirmed);
  const results = await Promise.allSettled([
    chooseFirstGrade(review, 'known'),
    chooseFirstGrade(review, 'vague'),
  ]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(sendFirstReview).toHaveBeenCalledTimes(1);
});

test('receipt recovery uses the original study day and does not attribute completion to the retry session', async () => {
  const review = await setup();
  jest
    .mocked(sendFirstReview)
    .mockRejectedValueOnce(new Error('lost'))
    .mockResolvedValueOnce({ ...confirmed, replayed: true });
  const failed = await chooseFirstGrade(review, 'known');
  jest.setSystemTime(new Date('2026-11-27T10:00:00Z'));
  const recovered = await confirmFirstGrade(failed);
  expect(recovered.completedAt).toBe(Date.parse(confirmed.reviewed));
  expect(recordStudyDay).toHaveBeenCalledWith(new Date(confirmed.reviewed));
});
test('guided telemetry never includes the entry identifier', async () => {
  jest.mocked(sendFirstReview).mockResolvedValue(confirmed);
  await chooseFirstGrade(await setup(), 'known');
  for (const [, props] of jest.mocked(analytics.track).mock.calls)
    expect(props).not.toHaveProperty('root_id');
});

test('only a finished guided drill satisfies the ordinary grade tutorial for this learner', async () => {
  const review = await setup();
  jest
    .mocked(sendFirstReview)
    .mockRejectedValueOnce(new Error('lost'))
    .mockResolvedValueOnce(confirmed);
  const pending = await chooseFirstGrade(review, 'known');
  expect((await loadAllTutorialStates('user'))[TutorialId.REVIEW_GRADES]).toBe(false);
  await confirmFirstGrade(pending);
  expect((await loadAllTutorialStates('user'))[TutorialId.REVIEW_GRADES]).toBe(true);
  expect((await loadAllTutorialStates('other'))[TutorialId.REVIEW_GRADES]).toBe(false);
});
