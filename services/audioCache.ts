import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { isRemoteAudioUrl } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';

export class AudioCacheManager {
  private static instance: AudioCacheManager;
  private cacheDir = `${Paths.cache.uri}audio/`;
  // In-memory cache to reduce file system checks
  private memoryCache = new Map<string, { path: string; timestamp: number }>();
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
      const cacheDir = new Directory(this.cacheDir);
      if (!cacheDir.exists) {
        await cacheDir.create();
      }
    } catch (error) {
      await handleError(error as Error, { showToast: false });
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
      const cachedFilePath = `${this.cacheDir}${cacheKey}`;

      // Check memory cache first for better performance
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        const isFresh = Date.now() - memoryEntry.timestamp < this.MEMORY_CACHE_TTL;
        if (isFresh) {
          return memoryEntry.path;
        }
        // Prune expired entry to cap memory growth
        this.memoryCache.delete(cacheKey);
      }

      const cachedFile = new File(cachedFilePath);
      if (cachedFile.exists) {
        // Update memory cache
        this.memoryCache.set(cacheKey, { path: cachedFilePath, timestamp: Date.now() });
        return cachedFilePath;
      }
      // Ensure any stale memory entry is removed
      this.memoryCache.delete(cacheKey);
      return null;
    } catch (error) {
      await handleError(error as Error, { showToast: false });
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
      const cachedFilePath = `${this.cacheDir}${cacheKey}`;

      // Download to cache
      const file = new File(cachedFilePath);
      const downloadResult = await File.downloadFileAsync(url, file);

      if (downloadResult.exists) {
        // Update memory cache
        this.memoryCache.set(cacheKey, { path: cachedFilePath, timestamp: Date.now() });
        return cachedFilePath;
      } else {
        throw new Error('Download failed - file does not exist after download');
      }
    } catch (error) {
      await handleError(error as Error, { showToast: false });
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

      // Cache miss - download and cache it
      return await this.cacheAudio(url);
    } catch (error) {
      await handleError(error as Error, {
        showToast: false,
        toastMessage: 'Audio caching failed. The app may experience slower audio loading.',
      });
      // Return original URL on failed download as fallback
      return url;
    }
  }

  /**
   * Clear all cached audio files
   */
  async clearCache(): Promise<void> {
    try {
      const cacheDir = new Directory(this.cacheDir);
      if (cacheDir.exists) {
        await cacheDir.delete();
        await this.ensureCacheDirectoryExists();
      }
      // Clear memory cache as well
      this.memoryCache.clear();
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
      const cacheDir = new Directory(this.cacheDir);
      if (!cacheDir.exists) {
        return 0;
      }

      const items = await cacheDir.list();

      const totalSize = items.reduce((size: number, item) => {
        // Only count files, not directories
        if ('size' in item && item.exists && item.size !== null) {
          return size + item.size;
        }
        return size;
      }, 0);

      return totalSize;
    } catch (error) {
      await handleError(error as Error);
      return 0;
    }
  }
}

// Export singleton instance
export const audioCache = AudioCacheManager.getInstance();
