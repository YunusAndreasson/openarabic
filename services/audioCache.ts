import NetInfo from '@react-native-community/netinfo';
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
  // Track pending downloads to prevent duplicate requests for same file
  private pendingDownloads = new Map<string, Promise<string>>();

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
   * Download and cache audio file with retry logic
   */
  private async cacheAudio(url: string): Promise<string> {
    await this.ensureCacheDirectoryExists();

    const cacheKey = await this.generateCacheKey(url);
    const cachedFilePath = `${this.cacheDir}${cacheKey}`;

    const maxRetries = 2; // 2 retries = 3 total attempts
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check network before retry (skip check on first attempt for efficiency)
        if (attempt > 0) {
          const netState = await NetInfo.fetch();
          if (!netState.isConnected) {
            throw new Error('No network connection available');
          }
          // Exponential backoff: 1s, 2s
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

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
        lastError = error as Error;
        const errorMsg = lastError.message.toLowerCase();

        // Don't retry on non-network errors (4xx, file system errors, etc.)
        const isNetworkError =
          errorMsg.includes('network') ||
          errorMsg.includes('failed') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('connection');

        if (!isNetworkError || attempt >= maxRetries) {
          await handleError(lastError, { showToast: false });
          throw lastError;
        }
        // Continue to retry for network errors
      }
    }

    // Should never reach here, but TypeScript needs it
    await handleError(lastError || new Error('Download failed'), { showToast: false });
    throw lastError || new Error('Download failed');
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

      // Check if download is already in progress for this URL
      const pendingDownload = this.pendingDownloads.get(url);
      if (pendingDownload) {
        // Reuse the existing download promise instead of starting a new download
        return await pendingDownload;
      }

      // Cache miss - start download and track it
      const downloadPromise = this.cacheAudio(url);
      this.pendingDownloads.set(url, downloadPromise);

      try {
        const result = await downloadPromise;
        return result;
      } finally {
        // Clean up pending download tracking regardless of success/failure
        this.pendingDownloads.delete(url);
      }
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
      // Clear memory cache and pending downloads
      this.memoryCache.clear();
      this.pendingDownloads.clear();
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
