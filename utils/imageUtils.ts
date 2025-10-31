/**
 * MIGRATED: Image and audio URL utilities have been consolidated
 * This file now re-exports from storageUtils.ts for backward compatibility
 *
 * New code should import from @/utils/storageUtils directly:
 * - generateStorageUrl('images', path)
 * - generateStorageUrl('audio', path)
 */

export {
  generateImageUrl,
  generateAudioUrl,
  generateStorageUrl,
  isValidStoragePath,
  type StorageBucket,
} from '@/utils/storageUtils';
