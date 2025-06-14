import { Rating } from 'ts-fsrs';
import { studyWordsFSRSService } from '../../services/studyWordsFSRS';

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  checkAuthentication: jest.fn(),
}));

const { supabase, checkAuthentication } = require('../../services/supabase');

beforeEach(() => {
  jest.clearAllMocks();
  (checkAuthentication as jest.Mock).mockResolvedValue(undefined);
});

describe('toggleFSRSStudyRoot', () => {
  it('inserts a new entry when none exists', async () => {
    const selectObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    };
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const insertObj = { insert: insertMock };

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => selectObj)
      .mockImplementationOnce(() => insertObj);

    const result = await studyWordsFSRSService.toggleFSRSStudyRoot('u1', 1);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', root_id: 1 })
    );
    expect(result).toBe(true);
  });

  it('deletes existing entry when found', async () => {
    const selectObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { root_id: 1 }, error: null }),
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
    expect(result).toBe(false);
  });
});

describe('updateWordAndReview', () => {
  const update = {
    fsrs_due: '2024-01-01T00:00:00.000Z',
    fsrs_stability: 1,
    fsrs_difficulty: 2,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: 0,
    fsrs_last_review: '2024-01-01T00:00:00.000Z',
    success_streak: 1,
    difficulty: 0.5,
  };

  it('calls RPC to update and record review', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
    const updateSpy = jest
      .spyOn(studyWordsFSRSService, 'updateFSRSWord')
      .mockResolvedValue(true);
    const reviewSpy = jest
      .spyOn(studyWordsFSRSService, 'recordFSRSReview')
      .mockResolvedValue(true);

    const result = await studyWordsFSRSService.updateWordAndReview(
      'u1',
      5,
      update,
      Rating.Good,
      3
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      'update_word_and_review',
      expect.objectContaining({ p_user_id: 'u1', p_root_id: 5, p_rating: Rating.Good })
    );
    expect(updateSpy).not.toHaveBeenCalled();
    expect(reviewSpy).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('falls back to individual updates on RPC failure', async () => {
    (supabase.rpc as jest.Mock).mockRejectedValue(new Error('fail'));
    const updateSpy = jest
      .spyOn(studyWordsFSRSService, 'updateFSRSWord')
      .mockResolvedValue(true);
    const reviewSpy = jest
      .spyOn(studyWordsFSRSService, 'recordFSRSReview')
      .mockResolvedValue(true);

    const result = await studyWordsFSRSService.updateWordAndReview(
      'u1',
      5,
      update,
      Rating.Hard,
      2
    );

    expect(updateSpy).toHaveBeenCalledWith('u1', 5, update);
    expect(reviewSpy).toHaveBeenCalledWith('u1', 5, Rating.Hard, 2);
    expect(result).toBe(true);
  });
});
