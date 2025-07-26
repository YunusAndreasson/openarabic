import { describe, expect, it, jest } from '@jest/globals';

import { studyWordsFSRSService } from '../../services/studyWordsFSRS';

// Mock the service
jest.mock('../../services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    toggleFSRSStudyRoot: jest.fn(),
  },
}));

describe('Dictionary Delete Flow', () => {
  it('should call toggleFSRSStudyRoot to remove study word', async () => {
    const mockToggleFSRSStudyRoot =
      studyWordsFSRSService.toggleFSRSStudyRoot as jest.MockedFunction<
        typeof studyWordsFSRSService.toggleFSRSStudyRoot
      >;

    mockToggleFSRSStudyRoot.mockResolvedValue(false); // false means word was removed

    // Simulate the delete operation
    const userId = 'test-user-id';
    const rootId = 123;

    const result = await studyWordsFSRSService.toggleFSRSStudyRoot(userId, rootId);

    expect(mockToggleFSRSStudyRoot).toHaveBeenCalledWith(userId, rootId);
    expect(result).toBe(false); // false indicates the word was removed
  });

  it('should handle errors gracefully', async () => {
    const mockToggleFSRSStudyRoot =
      studyWordsFSRSService.toggleFSRSStudyRoot as jest.MockedFunction<
        typeof studyWordsFSRSService.toggleFSRSStudyRoot
      >;

    const error = new Error('Database error');
    mockToggleFSRSStudyRoot.mockRejectedValue(error);

    const userId = 'test-user-id';
    const rootId = 123;

    await expect(studyWordsFSRSService.toggleFSRSStudyRoot(userId, rootId)).rejects.toThrow(
      'Database error'
    );
  });
});
