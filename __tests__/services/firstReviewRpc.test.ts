import { beforeEach, expect, jest, test } from '@jest/globals';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { loadFirstPage } from '@/services/firstPage';
import { loadFirstReviewCard, sendFirstReview } from '@/services/firstReviewRpc';
import { checkAuthentication, supabase } from '@/services/supabase';
import { CONFIDENCE_TO_RATING } from '@/constants/fsrs';
import { gradeWord } from '@/utils/fsrsScheduler';
import type { FirstReview, ReviewCard } from '@/services/firstReview';
import type { RootId } from '@/types/branded.types';
jest.mock('@/services/supabase', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
  checkAuthentication: jest.fn(),
}));
const root = 18276 as RootId;
const review: FirstReview = {
  id: 'review',
  owner: 'owner',
  version: 3,
  step: 'writing',
  word: {
    source: 'first_run_reader',
    rootId: root,
    occurrenceId: 59291,
    form: 'كَنْزٍ',
    gloss: 'a treasure',
  },
};
const row = createTestWord({ root_id: root });
const card: ReviewCard = {
  row,
  revision: 'expected',
  letters: 'كَنْزٍ',
  meaning: 'a treasure',
  sentence: 's',
  translation: 't',
};
const attempt = {
  id: 'attempt',
  grade: 'known' as const,
  update: gradeWord(row, CONFIDENCE_TO_RATING.known, new Date()),
};
const receipt = {
  status: 'confirmed',
  reviewed: '2026-11-23T09:00:00Z',
  root,
  attempt: 'attempt',
  grade: 'known',
  complete: true,
  due: attempt.update.fsrs_due,
  revision: 'new',
};
const rpc = supabase.rpc as unknown as jest.Mock<
  (name: string, args: unknown) => Promise<{ data: unknown; error: null }>
>;
function reply(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  return Object.assign(result, { setHeader: jest.fn((_name: string, _value: string) => result) });
}
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(checkAuthentication)
    .mockResolvedValue({ session: { access_token: 'checked-session' } } as Awaited<
      ReturnType<typeof checkAuthentication>
    >);
});
test('retry looks up the immutable receipt and skips the write if the original committed', async () => {
  rpc.mockReturnValueOnce(reply(receipt));
  await expect(sendFirstReview(review, card, attempt)).resolves.toMatchObject({
    replayed: true,
    complete: true,
  });
  expect(checkAuthentication).toHaveBeenCalledWith('owner');
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('grade_first_review', { p_root: root, p_attempt: 'attempt' });
});
test('only a missing receipt allows submitting the frozen schedule and revision', async () => {
  rpc
    .mockReturnValueOnce(reply({ status: 'missing' }))
    .mockReturnValueOnce(reply({ ...receipt, attempt: 'wrong' }));
  await expect(sendFirstReview(review, card, attempt)).rejects.toThrow('Unconfirmed');
  expect(rpc.mock.calls[1]?.[1]).toMatchObject({
    p_attempt: 'attempt',
    p_expected: { owner: 'owner', revision: 'expected', created: row.created_at },
    p_grade: 'known',
    p_update: attempt.update,
  });
});
test('bundled context uses occurrence 59291 while the card uses the saved dictionary row', async () => {
  const query = {
    select: () => query,
    eq: () => query,
    single: async () => ({
      data: { ...row, review_revision: null, root: { letters: 'canonical', meaning: 'meaning' } },
      error: null,
    }),
  };
  jest.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);
  await expect(loadFirstReviewCard('owner', review.word)).resolves.toMatchObject({
    letters: 'canonical',
    meaning: 'meaning',
    sentence: expect.stringContaining('كَنْزٍ'),
    translation: loadFirstPage().sentences[0]!.translation,
  });
  expect(supabase.from).toHaveBeenCalledTimes(1);
});

test('a session change before fetching a private grade receipt cannot select the next account', async () => {
  jest
    .mocked(checkAuthentication)
    .mockResolvedValueOnce({ session: { access_token: 'original-session' } } as Awaited<
      ReturnType<typeof checkAuthentication>
    >);
  const request = Object.assign(Promise.resolve({ data: { status: 'missing' }, error: null }), {
    setHeader: jest.fn((_name: string, _value: string) =>
      Promise.resolve({ data: receipt, error: null }),
    ),
  });
  rpc.mockReturnValueOnce(request);
  await expect(sendFirstReview(review, card, attempt)).resolves.toMatchObject({ replayed: true });
  expect(request.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer original-session');
});
