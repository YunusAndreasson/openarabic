/**
 * Unit tests for the feedback screenshot bucket helpers.
 *
 * The bucket is private and owner-only (supabase/migrations/20261120_create_feedback_screenshots_bucket.sql):
 * uploads go to `<userId>/…` as raw bytes, the report carries a signed link, and account deletion
 * empties the folder.
 */

import { File } from 'expo-file-system';

import {
  FEEDBACK_SCREENSHOT_LINK_SECONDS,
  FEEDBACK_SCREENSHOTS_BUCKET,
  removeFeedbackScreenshots,
  uploadFeedbackScreenshot,
} from '../../services/feedbackScreenshots';

jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('../../services/supabase', () => ({
  supabase: { storage: { from: jest.fn() } },
}));

const { supabase } = require('../../services/supabase');

const mockBytes = new ArrayBuffer(8);
const mockBucket = {
  upload: jest.fn(),
  createSignedUrl: jest.fn(),
  list: jest.fn(),
  remove: jest.fn(),
};

describe('feedbackScreenshots', () => {
  const userId = 'user-123';

  // resetMocks (jest.config.js) wipes implementations before every test, so set them here.
  beforeEach(() => {
    (File as unknown as jest.Mock).mockImplementation(() => ({
      arrayBuffer: async () => mockBytes,
    }));
    (supabase.storage.from as jest.Mock).mockImplementation(() => mockBucket);
  });

  describe('uploadFeedbackScreenshot', () => {
    test('uploads raw bytes into the user folder and returns a signed link', async () => {
      mockBucket.upload.mockResolvedValue({ data: { path: 'x' }, error: null });
      mockBucket.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null,
      });

      const result = await uploadFeedbackScreenshot(userId, 'file:///tmp/picked.jpg');

      expect(supabase.storage.from).toHaveBeenCalledWith(FEEDBACK_SCREENSHOTS_BUCKET);
      const [path, body, options] = mockBucket.upload.mock.calls[0];
      expect(path).toMatch(/^user-123\/\d+\.jpg$/);
      // An ArrayBuffer, never a Blob: React Native Blobs upload as 0-byte objects.
      expect(body).toBe(mockBytes);
      expect(options).toEqual({ contentType: 'image/jpeg' });
      expect(mockBucket.createSignedUrl).toHaveBeenCalledWith(
        path,
        FEEDBACK_SCREENSHOT_LINK_SECONDS,
      );
      expect(result).toEqual({ path, url: 'https://example.com/signed' });
    });

    test('keeps the picked format when the URI names one', async () => {
      mockBucket.upload.mockResolvedValue({ data: { path: 'x' }, error: null });
      mockBucket.createSignedUrl.mockResolvedValue({ data: null, error: new Error('no link') });

      const result = await uploadFeedbackScreenshot(userId, 'file:///tmp/shot.PNG');

      const [path, , options] = mockBucket.upload.mock.calls[0];
      expect(path).toMatch(/^user-123\/\d+\.png$/);
      expect(options).toEqual({ contentType: 'image/png' });
      // The upload worked; only the link failed, so the path still identifies the object.
      expect(result).toEqual({ path, url: null });
    });

    test('throws when the upload is refused', async () => {
      mockBucket.upload.mockResolvedValue({ data: null, error: new Error('row-level security') });

      await expect(uploadFeedbackScreenshot(userId, 'file:///tmp/picked.jpg')).rejects.toThrow(
        'row-level security',
      );
      expect(mockBucket.createSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('removeFeedbackScreenshots', () => {
    test('removes every object in the user folder', async () => {
      mockBucket.list.mockResolvedValueOnce({
        data: [{ name: 'a.jpg' }, { name: 'b.png' }],
        error: null,
      });
      mockBucket.remove.mockResolvedValueOnce({ data: [{}, {}], error: null });

      await removeFeedbackScreenshots(userId);

      expect(mockBucket.list).toHaveBeenCalledWith(userId, { limit: 100 });
      expect(mockBucket.remove).toHaveBeenCalledWith(['user-123/a.jpg', 'user-123/b.png']);
    });

    test('does nothing when the folder is empty', async () => {
      mockBucket.list.mockResolvedValueOnce({ data: [], error: null });

      await removeFeedbackScreenshots(userId);

      expect(mockBucket.remove).not.toHaveBeenCalled();
    });

    test('keeps paging while full pages come back', async () => {
      const fullPage = Array.from({ length: 100 }, (_, i) => ({ name: `${i}.jpg` }));
      mockBucket.list
        .mockResolvedValueOnce({ data: fullPage, error: null })
        .mockResolvedValueOnce({ data: [{ name: 'last.jpg' }], error: null });
      mockBucket.remove
        .mockResolvedValueOnce({ data: fullPage, error: null })
        .mockResolvedValueOnce({ data: [{}], error: null });

      await removeFeedbackScreenshots(userId);

      expect(mockBucket.list).toHaveBeenCalledTimes(2);
      expect(mockBucket.remove).toHaveBeenCalledTimes(2);
    });

    test('stops when a delete is silently refused instead of looping', async () => {
      const fullPage = Array.from({ length: 100 }, (_, i) => ({ name: `${i}.jpg` }));
      mockBucket.list.mockResolvedValue({ data: fullPage, error: null });
      mockBucket.remove.mockResolvedValue({ data: [], error: null });

      await removeFeedbackScreenshots(userId);

      expect(mockBucket.list).toHaveBeenCalledTimes(1);
    });

    test('throws when the folder cannot be listed', async () => {
      mockBucket.list.mockResolvedValueOnce({
        data: null,
        error: new Error('Storage unavailable'),
      });

      await expect(removeFeedbackScreenshots(userId)).rejects.toThrow('Storage unavailable');
    });
  });
});
