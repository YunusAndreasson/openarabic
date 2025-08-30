import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

import { isRemoteAudioUrl } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';

export class AudioCacheManager {
  private static instance: AudioCacheManager;
  private cacheDir = FileSystem.cacheDirectory + 'audio/';
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
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
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
      const cachedFilePath = this.cacheDir + cacheKey;

      // Check memory cache first for better performance
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && Date.now() - memoryEntry.timestamp < this.MEMORY_CACHE_TTL) {
        return memoryEntry.path;
      }

      const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);
      if (fileInfo.exists) {
        // Update memory cache
        this.memoryCache.set(cacheKey, { path: cachedFilePath, timestamp: Date.now() });
        return cachedFilePath;
      }

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
      const cachedFilePath = this.cacheDir + cacheKey;

      // Download to cache
      const downloadResult = await FileSystem.downloadAsync(url, cachedFilePath);

      if (downloadResult.status === 200) {
        // Update memory cache
        this.memoryCache.set(cacheKey, { path: cachedFilePath, timestamp: Date.now() });
        return cachedFilePath;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
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
        showToast: true,
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
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDir);
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
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(this.cacheDir);

      const infoPromises = files.map(file => FileSystem.getInfoAsync(this.cacheDir + file));
      const fileInfos = await Promise.all(infoPromises);

      const totalSize = fileInfos.reduce((size, info) => {
        if (info.exists && 'size' in info) {
          return size + info.size;
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
