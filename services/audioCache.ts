import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

import { isRemoteAudioUrl } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';

export class AudioCacheManager {
  private static instance: AudioCacheManager;
  private cacheDir = FileSystem.cacheDirectory + 'audio/';

  private constructor() {
    this.ensureCacheDirectoryExists();
  }

  static getInstance(): AudioCacheManager {
    if (!AudioCacheManager.instance) {
      AudioCacheManager.instance = new AudioCacheManager();
    }
    return AudioCacheManager.instance;
  }

  /**
   * Ensure the cache directory exists
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  /**
   * Generate a cache key from URL
   */
  private async generateCacheKey(url: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, url);
    // Extract file extension from URL if available
    const urlParts = url.split('.');
    const lastPart = urlParts.length > 1 ? urlParts[urlParts.length - 1] : '';
    const extension = lastPart ? lastPart.split('?')[0] : 'mp3';
    return `${hash}.${extension}`;
  }

  /**
   * Get cached audio file path if it exists
   */
  private async getCachedFilePath(url: string): Promise<string | null> {
    try {
      const cacheKey = await this.generateCacheKey(url);
      const cachedFilePath = this.cacheDir + cacheKey;

      const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);
      if (fileInfo.exists) {
        return cachedFilePath;
      }

      return null;
    } catch (error) {
      console.error('Error checking cached audio:', error);
      return null;
    }
  }

  /**
   * Download and cache audio file
   */
  private async cacheAudio(url: string): Promise<string> {
    try {
      await this.ensureCacheDirectoryExists();

      const cacheKey = await this.generateCacheKey(url);
      const cachedFilePath = this.cacheDir + cacheKey;

      // Download to cache
      const downloadResult = await FileSystem.downloadAsync(url, cachedFilePath);

      if (downloadResult.status === 200) {
        return cachedFilePath;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error caching audio:', error);
      throw error;
    }
  }

  /**
   * Get audio file - returns cached path if available, otherwise downloads and caches
   * For local files, returns the original URL without caching
   */
  async getAudio(url: string): Promise<string> {
    try {
      // Don't cache local files - return them directly
      if (!isRemoteAudioUrl(url)) {
        return url;
      }

      // First check if we have it cached
      const cachedPath = await this.getCachedFilePath(url);
      if (cachedPath) {
        return cachedPath;
      }

      // If not cached, download and cache it
      return await this.cacheAudio(url);
    } catch (error) {
      console.error('Error getting audio:', error);
      // Fallback to original URL if caching fails
      return url;
    }
  }

  /**
   * Clear all cached audio files
   */
  async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDir);
        await this.ensureCacheDirectoryExists();
      }
    } catch (error) {
      await handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = this.cacheDir + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size;
        }
      }

      return totalSize;
    } catch (error) {
      await handleError(error as Error);
      return 0;
    }
  }
}

// Export singleton instance
export const audioCache = AudioCacheManager.getInstance();
