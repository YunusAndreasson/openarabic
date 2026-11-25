import { beforeEach, expect, jest, test } from '@jest/globals';
import { completeReaderSave } from '@/hooks/onboarding/useReaderSave';
import { readerSaveReceipt } from '@/services/readerSaveRpc';
import { analytics } from '@/services/analytics';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { readerSave } from '@/services/readerSave';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { keepWidgetOccurrence } from '@/services/widgets/storage';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import type { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
jest.mock('@/services/readerSaveRpc', () => ({ readerSaveReceipt: jest.fn(async () => 'legacy') }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: jest.fn() },
}));
jest.mock('@/services/widgets/storage', () => ({
  keepWidgetOccurrence: jest.fn(async () => undefined),
}));
jest.mock('@/utils/network', () => ({ isKnownOffline: async () => false }));
const lookup = jest.mocked(studyWordsFSRSService.getFSRSWords);
const word = {
  source: 'first_run_reader' as const,
  rootId: 11 as RootId,
  occurrenceId: 23,
  form: 'a',
  gloss: 'b',
};
const add = jest.fn<ReturnType<typeof useStudyWordMutations>['handleRootPress']>();
beforeEach(async () => {
  const old = await readerSave.load();
  if (old) await readerSave.change(old.id, () => null);
  lookup.mockResolvedValue([]);
  jest.mocked(keepWidgetOccurrence).mockResolvedValue(undefined);
  jest.mocked(readerSaveReceipt).mockResolvedValue('legacy');
});
test('only the verified owner writes, with explicit add, once across overlapping completions', async () => {
  const save = (await readerSave.begin(word, 'long_press', 'owner'))!;
  add.mockImplementation(async (_root, _intent, options) => {
    options?.onConfirmed?.(true);
    return true;
  });
  await completeReaderSave(save, 'other', add);
  expect(lookup).not.toHaveBeenCalled();
  await Promise.all([
    completeReaderSave(save, 'owner', add),
    completeReaderSave(save, 'owner', add),
  ]);
  expect(add).toHaveBeenCalledTimes(1);
  expect(add).toHaveBeenCalledWith(
    word.rootId,
    'add',
    expect.objectContaining({ expectedOwner: 'owner', method: 'long_press' }),
  );
  expect(readerSave.snapshot()?.phase).toBe('saved');
});
test('existing study state is confirmed without grading, reserving quota, or writing it again', async () => {
  const save = (await readerSave.begin(word, 'sheet', 'owner'))!;
  lookup.mockResolvedValue([{ root_id: word.rootId } as StudyWord]);
  await completeReaderSave(save, 'owner', add);
  expect(add).not.toHaveBeenCalled();
  expect(readerSave.snapshot()?.phase).toBe('existing');
});
test('a missing acknowledgement is reconciled; a refused write stays retryable', async () => {
  const save = (await readerSave.begin(word, 'sheet', 'owner'))!;
  add.mockResolvedValue(undefined);
  await completeReaderSave(save, 'owner', add);
  expect(readerSave.snapshot()?.phase).toBe('failed');
  const retry = (await readerSave.change(save.id, s => ({ ...s, phase: 'ready' })))!;
  lookup.mockResolvedValueOnce([]).mockResolvedValueOnce([{ root_id: word.rootId } as StudyWord]);
  await completeReaderSave(retry, 'owner', add);
  expect(readerSave.snapshot()?.phase).toBe('existing');
});

test('lost acknowledgement replays the durable add after deletion without inserting again or disclosing the entry', async () => {
  const save = (await readerSave.begin(word, 'sheet', 'owner'))!;
  jest.mocked(readerSaveReceipt).mockResolvedValueOnce('missing').mockResolvedValueOnce('saved');
  add.mockResolvedValue(undefined);
  await completeReaderSave(save, 'owner', add);
  expect(readerSave.snapshot()?.phase).toBe('failed');
  const retry = (await readerSave.change(save.id, s => ({ ...s, phase: 'ready' })))!;
  await completeReaderSave(retry, 'owner', add);
  expect(add).toHaveBeenCalledTimes(1);
  expect(lookup).not.toHaveBeenCalled();
  expect(readerSave.snapshot()?.phase).toBe('saved');
  const events = jest
    .mocked(analytics.track)
    .mock.calls.filter(([e]) => e === ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY);
  expect(events).toHaveLength(1);
  expect(events[0]?.[1]).not.toHaveProperty('root_id');
});

// Characterize the emergency fallback on a server without save receipts.
test('binary-first rollout: removal between commit and journal replay', async () => {
  const save = (await readerSave.begin(word, 'sheet', 'owner'))!;
  let exists = false,
    inserts = 0;
  lookup.mockImplementation(async () => (exists ? [{ root_id: word.rootId } as StudyWord] : []));
  add.mockImplementation(async (_r, _i, o) => {
    if (!exists) {
      inserts++;
      exists = true;
    }
    o?.onConfirmed?.(true);
    return true;
  });
  const disk = jest.spyOn(readerSave, 'change');
  disk.mockRejectedValueOnce(new Error('acknowledgement lost'));
  await completeReaderSave(save, 'owner', add);
  exists = false;
  const retry = (await readerSave.change(save.id, s => ({ ...s, phase: 'ready' })))!;
  await completeReaderSave(retry, 'owner', add);
  expect([inserts, exists]).toEqual([2, true]);
});
test('fallback loses attribution when the committed row outlives the failed acknowledgement', async () => {
  const save = (await readerSave.begin(word, 'sheet', 'owner'))!;
  let committed = false;
  lookup.mockImplementation(async () => (committed ? [{ root_id: word.rootId } as StudyWord] : []));
  add.mockImplementation(async () => {
    committed = true;
    return undefined;
  });
  await completeReaderSave(save, 'owner', add);
  expect(readerSave.snapshot()?.phase).toBe('existing');
  expect(analytics.track).not.toHaveBeenCalledWith(
    ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY,
    expect.anything(),
  );
});

test('a dictionary save completes after account verification without sending a fabricated reader occurrence to the widget', async () => {
  const { rootId, form, gloss } = word;
  const guestSave = (await readerSave.begin(
    { source: 'dictionary', rootId, form, gloss },
    'sheet',
  ))!;
  await completeReaderSave(guestSave, 'owner', add);
  expect(add).not.toHaveBeenCalled();

  const verified = (await readerSave.change(guestSave.id, old => ({
    ...old,
    owner: 'owner',
    phase: 'ready',
    verified: true,
  })))!;
  add.mockImplementation(async (_root, _intent, options) => {
    options?.onConfirmed?.(true);
    return true;
  });
  await completeReaderSave(verified, 'owner', add);
  expect(add).toHaveBeenCalledTimes(1);
  expect(add).toHaveBeenCalledWith(
    rootId,
    'add',
    expect.objectContaining({ expectedOwner: 'owner' }),
  );
  expect(readerSave.snapshot()).toMatchObject({
    id: guestSave.id,
    phase: 'saved',
    word: { rootId },
  });
  expect(keepWidgetOccurrence).not.toHaveBeenCalled();
});
