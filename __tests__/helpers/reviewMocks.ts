import { jest } from '@jest/globals';

/** Shared audio-cache module shape for the split useReview suites. */
/** @internal Reached through a jest.mock require(); knip cannot see it. */
export function createReviewAudioCacheMock() {
  return {
    audioCache: {
      // Synchronous on purpose: production awaits it, and tests avoid a timing hop.
      getAudio: jest.fn((url: string) => url),
      preloadAudio: jest.fn((..._args: unknown[]) => Promise.resolve()),
      clearCache: jest.fn((..._args: unknown[]) => Promise.resolve()),
    },
  };
}

function storageUrl(bucket: string, path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `https://example.com/storage/${bucket}/${path}`;
}

/** Shared storage URL module shape for the split useReview suites. */
/** @internal Reached through a jest.mock require(); knip cannot see it. */
export function createReviewStorageUtilsMock() {
  return {
    generateStorageUrl: jest.fn(storageUrl),
    generateImageUrl: jest.fn((path: string | null | undefined) => storageUrl('images', path)),
    generateAudioUrl: jest.fn((path: string | null | undefined) => storageUrl('audio', path)),
  };
}

/** Shared signed-in Supabase module shape for the split useReview suites. */
/** @internal Reached through a jest.mock require(); knip cannot see it. */
export function createReviewSupabaseMock() {
  return {
    ...jest.requireActual<Record<string, unknown>>('@/services/supabase'),
    checkAuthentication: jest.fn(async (..._args: unknown[]) => ({
      session: { user: { id: 'test-user-123' } },
      user: { id: 'test-user-123' },
    })),
  };
}
