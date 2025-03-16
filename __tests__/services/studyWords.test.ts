import { studyWordsService } from '../../services/studyWords';
import { supabase } from '../../services/supabase';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

describe('studyWordsService', () => {
  const mockUserId = 'user-123';
  const mockDate = new Date('2023-01-01T00:00:00Z');

  // Setup test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now() to return a fixed timestamp
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  });

  // Cleanup
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getStudyWords', () => {
    it('should fetch study words for a user with default options', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock database response
      const mockStudyWords = [
        {
          id: 1,
          user_id: mockUserId,
          sentence_word_id: 101,
          interval_days: 1,
          ease_factor: 2.5,
          next_review_at: '2023-01-02T00:00:00Z',
          review_count: 0,
          sentence_word: {
            id: 101,
            word: 'test',
            root: { id: 1, word: 'test' },
            word_type: { id: 1, name: 'noun' },
            sentence: { id: 201, text: 'This is a test sentence.' },
          },
        },
      ];

      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockStudyWords,
          error: null,
        }),
      });

      const result = await studyWordsService.getStudyWords(mockUserId);

      expect(result).toEqual(mockStudyWords);
      expect(supabase.from).toHaveBeenCalledWith('study_words');
      // Should select including relationships
      expect(supabase.from('study_words').select).toHaveBeenCalledWith(
        expect.stringContaining('sentence_word:sentence_words')
      );
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock no session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(studyWordsService.getStudyWords(mockUserId)).rejects.toThrow(
        'User must be authenticated to manage study words'
      );
    });

    it('should throw error when user ID mismatch', async () => {
      // Mock different user ID in session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'different-user' } } },
        error: null,
      });

      await expect(studyWordsService.getStudyWords(mockUserId)).rejects.toThrow('User ID mismatch');
    });

    it('should apply due date filter when onlyDue is true', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock database query builder
      const mockLteReturn = {
        data: [],
        error: null,
      };
      const mockEqReturn = {
        lte: jest.fn().mockReturnValue(mockLteReturn),
      };
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      await studyWordsService.getStudyWords(mockUserId, { onlyDue: true });

      // Should call lte with the current date
      expect(mockEqReturn.lte).toHaveBeenCalledWith('next_review_at', mockDate.toISOString());
    });

    it('should select only stats fields when forStats is true', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock database response
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await studyWordsService.getStudyWords(mockUserId, { forStats: true });

      // Should select only the fields needed for stats
      expect(supabase.from('study_words').select).toHaveBeenCalledWith(
        'interval_days, next_review_at, review_count, created_at, sentence_word_id, difficulty, success_streak, failure_streak'
      );
    });

    it('should throw error when database query fails', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock database error
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      await expect(studyWordsService.getStudyWords(mockUserId)).rejects.toThrow('Database error');
    });

    // Edge case: empty results
    it('should handle empty results', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock empty database response
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await studyWordsService.getStudyWords(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('updateWordReview', () => {
    const mockSentenceWordId = 101;
    const mockWordUpdate = {
      interval_days: 2,
      ease_factor: 2.3,
      next_review_at: '2023-01-03T00:00:00Z',
      review_count: 1,
      lapses: 0,
      stability: 1.5,
      previous_interval: 1,
    };

    it('should update word review for an existing study word', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock finding the word
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, user_id: mockUserId, sentence_word_id: mockSentenceWordId },
              error: null,
            }),
          }),
        }),
      });

      // Mock updating the word
      (supabase.from('study_words').update as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      await studyWordsService.updateWordReview(mockSentenceWordId, mockWordUpdate);

      // Verify the update was called with the correct parameters
      expect(supabase.from).toHaveBeenCalledWith('study_words');
      expect(supabase.from('study_words').update).toHaveBeenCalledWith(mockWordUpdate);
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock no session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        studyWordsService.updateWordReview(mockSentenceWordId, mockWordUpdate)
      ).rejects.toThrow('User must be authenticated to manage study words');
    });

    it('should throw error when word does not exist or does not belong to user', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word not found
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        studyWordsService.updateWordReview(mockSentenceWordId, mockWordUpdate)
      ).rejects.toThrow('Word not found or does not belong to user');
    });

    it('should throw error when check query fails', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock query error
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Check query failed'),
            }),
          }),
        }),
      });

      await expect(
        studyWordsService.updateWordReview(mockSentenceWordId, mockWordUpdate)
      ).rejects.toThrow('Check query failed');
    });

    it('should throw error when update query fails', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock finding the word
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, user_id: mockUserId, sentence_word_id: mockSentenceWordId },
              error: null,
            }),
          }),
        }),
      });

      // Mock update error
      (supabase.from('study_words').update as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: new Error('Update failed'),
          }),
        }),
      });

      await expect(
        studyWordsService.updateWordReview(mockSentenceWordId, mockWordUpdate)
      ).rejects.toThrow('Update failed');
    });

    // Edge case: partial update
    it('should handle partial update with only some fields', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock finding the word
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, user_id: mockUserId, sentence_word_id: mockSentenceWordId },
              error: null,
            }),
          }),
        }),
      });

      // Mock updating the word
      (supabase.from('study_words').update as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Partial update with only some fields
      const partialUpdate = {
        interval_days: 3,
        next_review_at: '2023-01-04T00:00:00Z',
      };

      await studyWordsService.updateWordReview(mockSentenceWordId, partialUpdate as any);

      // Verify the update was called with the correct parameters
      expect(supabase.from('study_words').update).toHaveBeenCalledWith(partialUpdate);
    });
  });

  describe('toggleStudyWord', () => {
    const mockSentenceWordId = 101;

    it('should add a word to study list when it does not exist', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word not found
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // No rows returned
            }),
          }),
        }),
      });

      // Mock inserting the word
      (supabase.from('study_words').insert as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId);

      // Should return true for added word
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('study_words');
      expect(supabase.from('study_words').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          sentence_word_id: mockSentenceWordId,
          next_review_at: mockDate.toISOString(),
          created_at: mockDate.toISOString(),
        })
      );
    });

    it('should remove a word from study list when it exists', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word found
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, user_id: mockUserId, sentence_word_id: mockSentenceWordId },
              error: null,
            }),
          }),
        }),
      });

      // Mock deleting the word
      (supabase.from('study_words').delete as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId);

      // Should return false for removed word
      expect(result).toBe(false);
      expect(supabase.from).toHaveBeenCalledWith('study_words');
      expect(supabase.from('study_words').delete).toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock no session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId)
      ).rejects.toThrow('User must be authenticated to manage study words');
    });

    it('should throw error when user ID mismatch', async () => {
      // Mock different user ID in session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'different-user' } } },
        error: null,
      });

      await expect(
        studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId)
      ).rejects.toThrow('User ID mismatch');
    });

    it('should throw error when check query fails with non-PGRST116 error', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock query error
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'OTHER_ERROR', message: 'Other error' },
            }),
          }),
        }),
      });

      await expect(
        studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId)
      ).rejects.toEqual({
        code: 'OTHER_ERROR',
        message: 'Other error',
      });
    });

    it('should throw error when delete fails', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word found
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, user_id: mockUserId, sentence_word_id: mockSentenceWordId },
              error: null,
            }),
          }),
        }),
      });

      // Mock delete error
      (supabase.from('study_words').delete as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: new Error('Delete failed'),
          }),
        }),
      });

      await expect(
        studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId)
      ).rejects.toThrow('Delete failed');
    });

    it('should throw error when insert fails', async () => {
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word not found
      (supabase.from('study_words').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // No rows returned
            }),
          }),
        }),
      });

      // Mock insert error
      (supabase.from('study_words').insert as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            error: new Error('Insert failed'),
          }),
        }),
      });

      await expect(
        studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId)
      ).rejects.toThrow('Insert failed');
    });

    // Edge case: reinsert word that was previously deleted
    it('should handle re-adding a word that was previously deleted', async () => {
      // First remove a word
      // Mock user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word found
      (supabase.from('study_words').select as jest.Mock).mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, user_id: mockUserId, sentence_word_id: mockSentenceWordId },
              error: null,
            }),
          }),
        }),
      });

      // Mock delete success
      (supabase.from('study_words').delete as jest.Mock).mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // First, remove the word
      await studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId);

      // Then, add it back
      // Mock user session again
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      });

      // Mock word not found
      (supabase.from('study_words').select as jest.Mock).mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // No rows returned
            }),
          }),
        }),
      });

      // Mock inserting the word
      (supabase.from('study_words').insert as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await studyWordsService.toggleStudyWord(mockUserId, mockSentenceWordId);

      // Should return true for re-added word
      expect(result).toBe(true);
    });
  });
});
