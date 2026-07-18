/**
 * Service Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: test.concurrent() used where tests are independent
 */

import { studyWordsFSRSService } from '../../services/studyWordsFSRS';

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  checkAuthentication: jest.fn(),
}));

const { supabase, checkAuthentication } = require('../../services/supabase');

const createBuilder = (response: any = { data: [], error: null }) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
  builder.then = jest.fn((resolve, reject) => Promise.resolve(response).then(resolve, reject));
  return builder;
};

beforeEach(() => {
  jest.clearAllMocks();
  (checkAuthentication as jest.Mock).mockResolvedValue(undefined);
});

describe('toggleFSRSStudyRoot', () => {
  test('inserts a new entry when none exists', async () => {
    const selectObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const insertObj = { insert: insertMock };

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => selectObj)
      .mockImplementationOnce(() => insertObj);

    const result = await studyWordsFSRSService.toggleFSRSStudyRoot('u1', 1);

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', root_id: 1 }));
    expect(result).toBeTruthy();
  });

  test('deletes existing entry when found', async () => {
    const selectObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { root_id: 1 }, error: null }),
    };
    const deleteFinal = jest.fn().mockResolvedValue({ error: null });
    const deleteObj = {
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: deleteFinal,
        }),
      }),
    };

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => selectObj)
      .mockImplementationOnce(() => deleteObj);

    const result = await studyWordsFSRSService.toggleFSRSStudyRoot('u1', 1);

    expect(deleteObj.delete).toHaveBeenCalled();
    expect(deleteFinal).toHaveBeenCalled();
    expect(result).toBeFalsy();
  });

  test("intent 'add' on an existing entry is a no-op — never a delete", async () => {
    const selectObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { root_id: 1 }, error: null }),
    };
    const deleteMock = jest.fn();
    const insertMock = jest.fn();

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => selectObj)
      .mockImplementation(() => ({ delete: deleteMock, insert: insertMock }));

    const result = await studyWordsFSRSService.toggleFSRSStudyRoot('u1', 1, 'add');

    expect(result).toBeTruthy();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("intent 'remove' on a missing entry is a no-op — never an insert", async () => {
    const selectObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const deleteMock = jest.fn();
    const insertMock = jest.fn();

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => selectObj)
      .mockImplementation(() => ({ delete: deleteMock, insert: insertMock }));

    const result = await studyWordsFSRSService.toggleFSRSStudyRoot('u1', 1, 'remove');

    expect(result).toBeFalsy();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe('updateWordAndReview', () => {
  const update = {
    fsrs_due: '2024-01-01T00:00:00.000Z',
    fsrs_stability: 1,
    fsrs_difficulty: 2,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: 0,
    fsrs_last_review: '2024-01-01T00:00:00.000Z',
  };

  test('calls direct UPDATE to update word FSRS parameters', async () => {
    const selectMock = jest.fn().mockResolvedValue({ data: [{ root_id: 5 }], error: null });
    const updateObj = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: selectMock,
    };

    (supabase.from as jest.Mock).mockReturnValue(updateObj);

    const result = await studyWordsFSRSService.updateWordAndReview('u1', 5, update);

    expect(supabase.from).toHaveBeenCalledWith('study_words');
    expect(updateObj.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fsrs_due: update.fsrs_due,
        fsrs_stability: update.fsrs_stability,
        fsrs_last_review: update.fsrs_last_review,
      }),
    );
    expect(updateObj.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(updateObj.eq).toHaveBeenCalledWith('root_id', 5);
    expect(result).toBeTruthy();
  });
});

describe('getFSRSWords', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('adds due filter when onlyDue is true', async () => {
    const builder = createBuilder();
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await studyWordsFSRSService.getFSRSWords('u1', { onlyDue: true });

    expect(supabase.from).toHaveBeenCalledWith('study_words');
    // Now uses .or() to include both due words and new words (state 0)
    expect(builder.or).toHaveBeenCalledWith(
      `fsrs_due.lte.${new Date('2024-01-01T00:00:00.000Z').toISOString()},fsrs_state.eq.0`,
    );
  });

  test('selects reduced columns when forStats is true', async () => {
    const builder = createBuilder();
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await studyWordsFSRSService.getFSRSWords('u1', { forStats: true });

    const called = builder.select.mock.calls[0][0].replace(/\s/g, '');
    const expected = `
        fsrs_due,
        fsrs_stability,
        fsrs_difficulty,
        fsrs_scheduled_days,
        fsrs_reps,
        fsrs_learning_steps,
        fsrs_lapses,
        fsrs_state,
        fsrs_last_review,
        root_id,
        created_at`.replace(/\s/g, '');

    expect(called).toBe(expected);
  });

  test('applies mastered and learning category filters', async () => {
    const builder = createBuilder();
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await studyWordsFSRSService.getFSRSWords('u1', { category: 'mastered' });

    expect(builder.eq).toHaveBeenCalledWith('fsrs_state', 2);
    expect(builder.gte).toHaveBeenCalledWith('fsrs_stability', 5);

    builder.eq.mockClear();
    builder.gte.mockClear();
    builder.or.mockClear();

    await studyWordsFSRSService.getFSRSWords('u1', { category: 'learning' });

    // State 0 (New) words are due for first review, not learning
    // Only states 1, 3, or state 2 with low stability are learning
    expect(builder.or).toHaveBeenCalledWith(
      'fsrs_state.in.(1,3),and(fsrs_state.eq.2,fsrs_stability.lt.5)',
    );
  });

  test('throws when supabase returns an error', async () => {
    const err = new Error('bad');
    const builder = createBuilder({ data: null, error: err });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await expect(studyWordsFSRSService.getFSRSWords('u1')).rejects.toThrow(err);
  });

  describe('getFSRSWords - Session Cooldown', () => {
    test('should exclude words reviewed within cooldown period', async () => {
      const userId = 'test-user-cooldown';

      const olderWord = {
        root_id: 2,
        user_id: userId,
        fsrs_last_review: '2023-12-31T22:00:00.000Z',
      };
      const neverReviewedWord = { root_id: 3, user_id: userId, fsrs_last_review: null };

      const builder = createBuilder({
        data: [olderWord, neverReviewedWord],
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        sessionCooldownHours: 1.5, // 1.5 hour cooldown
      });

      expect(result).toHaveLength(2);
      expect(result).toEqual([olderWord, neverReviewedWord]);

      // Verify that the cooldown filter was applied correctly
      expect(builder.or).toHaveBeenCalledWith(
        expect.stringContaining('fsrs_last_review.is.null,fsrs_last_review.lt.'),
      );
    });

    test('should not apply cooldown when sessionCooldownHours is 0', async () => {
      const userId = 'test-user-no-cooldown';

      const recentWord = {
        root_id: 1,
        user_id: userId,
        fsrs_last_review: '2023-12-31T23:30:00.000Z',
      };

      const builder = createBuilder({ data: [recentWord], error: null });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        sessionCooldownHours: 0, // No cooldown
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(recentWord);

      // Verify that or() was called once for the due filter (includes new words)
      expect(builder.or).toHaveBeenCalledTimes(1);
      expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('fsrs_due.lte.'));
    });

    test('should apply both due date and cooldown filters together', async () => {
      const userId = 'test-user-combined-filters';

      const dueAndCoolWord = {
        root_id: 1,
        user_id: userId,
        fsrs_last_review: '2023-12-31T21:00:00.000Z',
      };

      const builder = createBuilder({ data: [dueAndCoolWord], error: null });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        sessionCooldownHours: 2, // 2 hour cooldown
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(dueAndCoolWord);

      // Verify both filters were applied
      expect(builder.or).toHaveBeenCalledTimes(2); // Once for due filter, once for cooldown
      expect(builder.or).toHaveBeenCalledWith(
        expect.stringContaining('fsrs_due.lte.'), // Due filter includes new words
      );
      expect(builder.or).toHaveBeenCalledWith(
        expect.stringContaining('fsrs_last_review.is.null,fsrs_last_review.lt.'), // Cooldown filter
      );
    });
  });
});
