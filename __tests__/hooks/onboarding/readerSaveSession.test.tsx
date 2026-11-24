import { beforeEach, expect, jest, test } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useReaderSaveCompletion, usePendingReaderSave } from '@/hooks/onboarding/useReaderSave';
import { analytics } from '@/services/analytics';
import { captureReaderExchange, bindReaderResponse } from '@/services/readerAuthExchange';
import { readerSave, type ReaderSave } from '@/services/readerSave';
import { startReaderAttempt } from '@/services/readerSaveAuth';
import type { RootId } from '@/types/branded.types';

let mockSessionMissing = false;
jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    session: mockSessionMissing
      ? null
      : {
          user: {
            id: 'verified-owner',
            created_at: '2016-11-01T00:00:00Z',
            last_sign_in_at: '2026-11-01T00:00:00Z',
          },
        },
  }),
}));
jest.mock('@/services/readerSaveRpc', () => ({ readerSaveReceipt: async () => 'legacy' }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: async () => [] },
}));
jest.mock('@/utils/network', () => ({ isKnownOffline: async () => false }));
const mockAdd = jest.fn();
jest.mock('@/hooks/articles/useStudyWordMutations', () => ({
  useStudyWordMutations: () => ({ handleRootPress: mockAdd }),
}));

beforeEach(async () => {
  mockSessionMissing = false;
  const prior = await readerSave.load();
  if (prior) await readerSave.change(prior.id, () => null);
});

test('a restored Add binds the published owner before mutation and emits one verified outcome', async () => {
  const saved = (await readerSave.begin(
    { source: 'first_run_reader', occurrenceId: 72, rootId: 19 as RootId, form: 'a', gloss: 'b' },
    'sheet',
  ))!;
  const attempt = (await startReaderAttempt(saved.id, 'google'))!;
  await attempt.exchange({ id_token: 'test-token' }, async () => {
    const bind = captureReaderExchange('{"id_token":"test-token"}')!;
    await bindReaderResponse(
      bind,
      '{"access_token":"test-session","user":{"id":"verified-owner"}}',
    );
  });
  expect(readerSave.snapshot()).toMatchObject({ phase: 'auth', owner: 'verified-owner' });
  expect(mockAdd).not.toHaveBeenCalled();
  mockAdd.mockImplementation(async (_root, _intent, options) => {
    (options as { onConfirmed: (changed: boolean) => void }).onConfirmed(true);
    return true;
  });
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  renderHook(
    () => {
      const pending = usePendingReaderSave() as ReaderSave;
      useReaderSaveCompletion(pending);
    },
    { wrapper },
  );
  await waitFor(() => expect(readerSave.snapshot()?.phase).toBe('saved'));
  expect(mockAdd).toHaveBeenCalledTimes(1);
  expect(mockAdd).toHaveBeenCalledWith(
    19,
    'add',
    expect.objectContaining({ expectedOwner: 'verified-owner' }),
  );
  const verified = jest
    .mocked(analytics.track)
    .mock.calls.filter(([name]) => name === ANALYTICS_EVENTS.AUTH_SESSION_VERIFIED);
  expect(verified).toHaveLength(1);
  expect(verified[0]?.[1]).toMatchObject({
    provider: 'google',
    sheet_id: saved.id,
    attempt_id: attempt.id,
    account_outcome: 'returning',
  });
});

test('a session-read outage keeps the owner-bound ready save on disk', async () => {
  mockSessionMissing = true;
  const save = (await readerSave.begin(
    { source: 'first_run_reader', rootId: 11 as RootId, occurrenceId: 8, form: 'a', gloss: 'b' },
    'sheet',
    'verified-owner',
  ))!;
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  renderHook(() => useReaderSaveCompletion(save), { wrapper });
  await readerSave.load();
  expect(readerSave.snapshot()?.id).toBe(save.id);
});
