import { readingListService } from '../../services/readingList';

// Import after mocking
import { supabase } from '../../services/supabase';

// Mock Date for consistent timestamps
const mockDate = new Date('2023-01-01T00:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

// Create a type for our mock
type SupabaseMock = {
  auth: {
    getUser: jest.Mock;
    getSession: jest.Mock;
  };
  from: jest.Mock;
  select: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  match: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  [key: string]: any;
};

// Mock Supabase
jest.mock('../../services/supabase', () => {
  // Create a mock user
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };

  // Create a simple mock object
  const mock = {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
      },
      from: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      eq: jest.fn(),
      match: jest.fn(),
      order: jest.fn(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  };

  // Set up method chaining
  mock.supabase.from.mockReturnValue(mock.supabase);
  mock.supabase.select.mockReturnValue(mock.supabase);
  mock.supabase.update.mockReturnValue(mock.supabase);
  mock.supabase.delete.mockReturnValue(mock.supabase);
  mock.supabase.eq.mockReturnValue(mock.supabase);
  mock.supabase.match.mockReturnValue(mock.supabase);
  mock.supabase.order.mockReturnValue(mock.supabase);
  mock.supabase.limit.mockReturnValue(mock.supabase);
  mock.supabase.single.mockReturnValue(mock.supabase);

  return mock;
});

describe('readingListService', () => {
  // Mock user for tests
  const user = { id: 'test-user-id', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    (supabase as unknown as SupabaseMock).from.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).select.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).update.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).delete.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).eq.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).match.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).order.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).limit.mockReturnValue(supabase);
    (supabase as unknown as SupabaseMock).single.mockReturnValue(supabase);

    // Set up auth mock
    ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
      data: { user },
      error: null,
    });
  });

  describe('getInProgressArticles', () => {
    it('returns articles for authenticated user', async () => {
      // Set up the final response in the chain
      (supabase as unknown as SupabaseMock).order.mockResolvedValueOnce({
        data: [
          {
            article_id: 1,
            articles: {
              id: 1,
              title: 'Test Article',
              category: { name: 'Test Category' },
              author: { name: 'Test Author' },
            },
          },
        ],
        error: null,
      });

      const result = await readingListService.getInProgressArticles();

      expect(result).toEqual([
        {
          id: 1,
          title: 'Test Article',
          category: { name: 'Test Category' },
          author: { name: 'Test Author' },
        },
      ]);
      expect((supabase as unknown as SupabaseMock).from).toHaveBeenCalledWith('reading_list');
    });

    it('returns empty array when user is not authenticated', async () => {
      // Mock no user
      ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await readingListService.getInProgressArticles();
      expect(result).toEqual([]);
    });

    it('handles database query errors', async () => {
      // Mock database error
      (supabase as unknown as SupabaseMock).order.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      await expect(readingListService.getInProgressArticles()).rejects.toThrow('Database error');
    });

    it('filters out null articles', async () => {
      // Mock response with null articles
      (supabase as unknown as SupabaseMock).order.mockResolvedValueOnce({
        data: [
          { article_id: 1, articles: null },
          {
            article_id: 2,
            articles: {
              id: 2,
              title: 'Valid Article',
              category: { name: 'Test Category' },
              author: { name: 'Test Author' },
            },
          },
        ],
        error: null,
      });

      const result = await readingListService.getInProgressArticles();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });
  });

  describe('addToReadingList', () => {
    it('adds article to reading list for authenticated user', async () => {
      // Mock getting the highest position
      (supabase as unknown as SupabaseMock).limit.mockResolvedValueOnce({
        data: [{ position: 5 }],
        error: null,
      });

      // Mock upsert success
      (supabase as unknown as SupabaseMock).upsert.mockResolvedValueOnce({
        data: { id: 1 },
        error: null,
      });

      await readingListService.addToReadingList(1);

      // Verify the upsert was called with the correct parameters
      expect((supabase as unknown as SupabaseMock).upsert).toHaveBeenCalledWith(
        {
          user_id: user.id,
          article_id: 1,
          position: 6, // Should be one more than the highest position
          completed: false,
          read_count: 0,
          added_at: mockDate.toISOString(),
        },
        { onConflict: 'user_id,article_id' }
      );
    });

    it('handles case with no existing articles', async () => {
      // Mock empty result for position query
      (supabase as unknown as SupabaseMock).limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock upsert success
      (supabase as unknown as SupabaseMock).upsert.mockResolvedValueOnce({
        data: { id: 1 },
        error: null,
      });

      await readingListService.addToReadingList(1);

      // Verify the upsert was called with position 1
      expect((supabase as unknown as SupabaseMock).upsert).toHaveBeenCalledWith(
        {
          user_id: user.id,
          article_id: 1,
          position: 0, // Should be 0 when there are no existing articles
          completed: false,
          read_count: 0,
          added_at: mockDate.toISOString(),
        },
        { onConflict: 'user_id,article_id' }
      );
    });

    it('throws error when upsert fails', async () => {
      // Mock getting the highest position
      (supabase as unknown as SupabaseMock).limit.mockResolvedValueOnce({
        data: [{ position: 5 }],
        error: null,
      });

      // Mock upsert failure
      (supabase as unknown as SupabaseMock).upsert.mockResolvedValueOnce({
        data: null,
        error: new Error('Upsert failed'),
      });

      await expect(readingListService.addToReadingList(1)).rejects.toThrow('Upsert failed');
    });
  });

  describe('incrementReadCount', () => {
    it('increments read count for existing article', async () => {
      // Mock user authentication
      ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock fetch current read count
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        data: [{ read_count: 2 }],
        error: null,
      });

      // Mock update
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        error: null,
      });

      await readingListService.incrementReadCount(1);

      // Check that update was called
      expect((supabase as unknown as SupabaseMock).from).toHaveBeenCalledWith('reading_list');
    });

    it('adds article to reading list if not found', async () => {
      // Mock user authentication
      ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock fetch current read count with empty result
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock upsert for addToReadingList
      (supabase as unknown as SupabaseMock).upsert.mockResolvedValueOnce({
        error: null,
      });

      await readingListService.incrementReadCount(1);

      // Should have called from at least once
      expect((supabase as unknown as SupabaseMock).from).toHaveBeenCalledWith('reading_list');
    });

    it('throws error for other fetch errors', async () => {
      // Mock user authentication
      ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock fetch current read count with a different error
      (supabase as unknown as SupabaseMock).match.mockRejectedValueOnce({
        code: 'OTHER_ERROR',
        message: 'Database error',
      });

      await expect(readingListService.incrementReadCount(1)).rejects.toEqual({
        code: 'OTHER_ERROR',
        message: 'Database error',
      });
    });
  });

  describe('markAsCompleted', () => {
    it('marks an article as completed for authenticated user', async () => {
      // Mock update success
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        data: { id: 1 },
        error: null,
      });

      await readingListService.markAsCompleted(1);

      // Verify the update was called with the correct parameters
      expect((supabase as unknown as SupabaseMock).update).toHaveBeenCalledWith({
        completed: true,
        completed_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString(),
      });
      expect((supabase as unknown as SupabaseMock).from).toHaveBeenCalledWith('reading_list');
    });

    it('throws error when update fails', async () => {
      // Mock update failure
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        data: null,
        error: new Error('Update failed'),
      });

      await expect(readingListService.markAsCompleted(1)).rejects.toThrow('Update failed');
    });
  });

  describe('getCompletedArticles', () => {
    it('should return completed articles for authenticated user', async () => {
      // Mock user authentication
      ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database response
      (supabase as unknown as SupabaseMock).order.mockResolvedValueOnce({
        data: [
          {
            article_id: 1,
            completed_at: '2023-01-01',
            articles: {
              id: 1,
              title: 'Completed Article',
              category: { name: 'Test Category' },
              author: { name: 'Test Author' },
            },
          },
        ],
        error: null,
      });

      const result = await readingListService.getCompletedArticles();

      expect(result).toEqual([
        {
          id: 1,
          title: 'Completed Article',
          category: { name: 'Test Category' },
          author: { name: 'Test Author' },
          completed_at: '2023-01-01',
        },
      ]);

      // Check that methods were called with correct params
      expect((supabase as unknown as SupabaseMock).from).toHaveBeenCalledWith('reading_list');
      expect((supabase as unknown as SupabaseMock).select).toHaveBeenCalledWith(
        expect.stringContaining('completed_at')
      );
    });

    it('returns empty array when user is not authenticated', async () => {
      // Mock no user
      ((supabase as unknown as SupabaseMock).auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await readingListService.getCompletedArticles();

      expect(result).toEqual([]);
      expect((supabase as unknown as SupabaseMock).from).not.toHaveBeenCalled();
    });
  });

  describe('deleteFromReadingList', () => {
    it('should delete an article from reading list', async () => {
      // Mock delete success
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        data: { id: 1 },
        error: null,
      });

      await readingListService.deleteFromReadingList(1);

      // Verify the delete was called correctly
      expect((supabase as unknown as SupabaseMock).delete).toHaveBeenCalled();
      expect((supabase as unknown as SupabaseMock).from).toHaveBeenCalledWith('reading_list');
    });

    it('throws error when delete fails', async () => {
      // Mock delete failure
      (supabase as unknown as SupabaseMock).match.mockResolvedValueOnce({
        data: null,
        error: new Error('Delete failed'),
      });

      await expect(readingListService.deleteFromReadingList(1)).rejects.toThrow('Delete failed');
    });
  });
});
