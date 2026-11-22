import { describe, expect, jest, test } from '@jest/globals';
import { Image } from 'expo-image';

import { prefetchArticleImages } from '@/utils/prefetchArticleImages';

jest.mock('expo-image', () => ({ Image: { prefetch: jest.fn() } }));
jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: (_bucket: string, path: string) => 'https://images.example/' + path,
}));

describe('image warming', () => {
  test('skips empty and malformed batches', async () => {
    await prefetchArticleImages([]);
    await prefetchArticleImages([
      null,
      undefined,
      ' ',
      'https://',
      'http://[',
      'file:///tmp/picture',
      '//no-host',
    ]);
    expect(Image.prefetch).not.toHaveBeenCalled();
  });

  test('one native call contains unique usable URLs even when a neighbour is malformed', async () => {
    await prefetchArticleImages([
      ' cover.jpg ',
      'https://',
      'https://images.example/cover.jpg',
      'folder/next image.jpg',
    ]);
    expect(Image.prefetch).toHaveBeenCalledTimes(1);
    expect(Image.prefetch).toHaveBeenCalledWith(
      ['https://images.example/cover.jpg', 'https://images.example/folder/next%20image.jpg'],
      { cachePolicy: 'memory-disk' },
    );
  });
});
