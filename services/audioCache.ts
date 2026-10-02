import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { isRemoteAudioUrl } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';
import { countDiag, isSessionActive, mark } from '@/utils/reviewDiagnostics';
import { STORAGE_KEYS } from '@/constants/storageKeys';

// One-time sweep flag (key naming mirrors the onboarding/notification keys).
// Files downloaded by the pre-overhaul implementation streamed straight into
// their final cache path, so a dropped connection could leave a truncated but
// non-empty file that the size>0 check treats as a valid hit forever. The
// temp-file download flow only protects writes made AFTER that overhaul —
// anything already on disk is untrusted and is deleted exactly once.
const LEGACY_CACHE_SWEEP_STORAGE_KEY = STORAGE_KEYS.AUDIO_CACHE_LEGACY_SWEEP;

/** Last path segment, for readable diagnostics without dumping signed URLs. */
function basename(url: string): string {
  const withoutQuery = url.split('?')[0] ?? url;
  return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1);
}

export interface GetAudioOptions {
  /**
   * Play-time mode: a single download attempt with a short timeout instead of
   * the patient multi-retry sequence. Use wherever a user is waiting on the
   * sound right now; the session preloader uses the default patient mode.
   */
  quick?: boolean;
}

class AudioCacheManager {
  private static instance: AudioCacheManager;
  private cacheDir = `${Paths.cache.uri}audio/`;
  // In-memory cache to reduce file system checks
  private memoryCache = new Map<string, { path: string; timestamp: number }>();
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MEMORY_CACHE_SIZE = 50; // Limit to prevent unbounded growth
  // Per-attempt download bounds. Word audio files are ~20-50KB, so these are
  // generous — their job is to stop a stalled connection from hanging callers
  // (iOS URLSession would otherwise wait 60s+ before giving up).
  private readonly DOWNLOAD_TIMEOUT_MS = 15000;
  private readonly QUICK_DOWNLOAD_TIMEOUT_MS = 6000;
  // Track pending downloads to prevent duplicate requests for same file
  private pendingDownloads = new Map<string, Promise<string>>();
  // Background (session-preload) downloads self-throttle through this gate so
  // a burst of prefetch requests can never hold every native connection slot
  // and starve a `quick` request for the card on screen right now. `quick`
  // downloads never touch this gate — they always call downloadFileAsync
  // immediately, which is the whole point: the card the learner is looking at
  // must never queue behind words they haven't reached yet. Found via a stress
  // session where a ~38-file background preload burst left the current card's
  // "quick" fetch waiting 3-4s just to START downloading, blowing the player's
  // ~5s ready deadline on nearly every card for the rest of the session.
  private readonly MAX_CONCURRENT_BACKGROUND_DOWNLOADS = 3;
  private backgroundDownloadSlotsInUse = 0;
  private backgroundDownloadWaiters: (() => void)[] = [];
  // Memoized one-time legacy sweep (see LEGACY_CACHE_SWEEP_STORAGE_KEY)
  private legacySweepPromise: Promise<void> | null = null;
  // url → cache key. generateCacheKey is an async native crypto call and runs
  // before the memory cache can even be consulted, so a warm practice session
  // was paying one native round trip per file per lookup. The mapping is a pure
  // function of the URL, so it can be memoized for the process lifetime.
  private cacheKeys = new Map<string, string>();

  private constructor() {
    void this.ensureCacheDirectoryExists();
  }

  /**
   * One-time purge of files written by the pre-overhaul cache implementation
   * (potentially truncated/poisoned — see LEGACY_CACHE_SWEEP_STORAGE_KEY).
   */
  private async sweepLegacyCacheFiles(): Promise<void> {
    const alreadySwept = await AsyncStorage.getItem(LEGACY_CACHE_SWEEP_STORAGE_KEY);
    if (alreadySwept) {
      return;
    }

    // Directory#list() is synchronous and throws when the directory is
    // missing — a missing cache dir simply has nothing to sweep.
    const cacheDir = new Directory(this.cacheDir);
    if (cacheDir.exists) {
      for (const entry of cacheDir.list()) {
        entry.delete();
      }
      this.memoryCache.clear();
    }

    // Only mark swept after every deletion succeeded — a partial sweep
    // retries on the next launch instead of trusting leftover files forever.
    await AsyncStorage.setItem(LEGACY_CACHE_SWEEP_STORAGE_KEY, 'true');
  }

  /**
   * Lazily run the legacy sweep exactly once per app session, before the
   * cache serves its first file. A failed sweep must never break audio: the
   * error is logged (not silently swallowed) and getAudio proceeds; the flag
   * stays unset so the next launch retries the sweep.
   */
  private ensureLegacySweep(): Promise<void> {
    if (!this.legacySweepPromise) {
      this.legacySweepPromise = this.sweepLegacyCacheFiles().catch(async error => {
        await handleError(error as Error, { showToast: false });
      });
    }
    return this.legacySweepPromise;
  }

  /**
   * Evict oldest entries if memory cache exceeds max size
   * Uses FIFO eviction since Map maintains insertion order
   */
  private evictIfNeeded(): void {
    while (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      } else {
        break;
      }
    }
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
        cacheDir.create();
      }
    } catch (error) {
      await handleError(error, { showToast: false });
    }
  }

  /**
   * Generate a cache key from URL
   */
  private async generateCacheKey(url: string): Promise<string> {
    const memoized = this.cacheKeys.get(url);
    if (memoized) {
      return memoized;
    }

    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, url);
    // Extract file extension from URL if available
    const urlParts = url.split('.');
    const lastPart = urlParts.length > 1 ? urlParts.at(-1) : '';
    const extension = lastPart ? lastPart.split('?')[0] : 'mp3';
    const cacheKey = `${hash}.${extension}`;
    this.cacheKeys.set(url, cacheKey);
    return cacheKey;
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
        if ((cachedFile.size ?? 0) > 0) {
          // Update memory cache
          this.memoryCache.set(cacheKey, { path: cachedFilePath, timestamp: Date.now() });
          this.evictIfNeeded();
          return cachedFilePath;
        }
        // Zero-byte artifact from an interrupted write — purge and re-download
        try {
          cachedFile.delete();
        } catch {
          // Best-effort cleanup; a re-download will overwrite it anyway
        }
      }
      // Ensure any stale memory entry is removed
      this.memoryCache.delete(cacheKey);
      return null;
    } catch (error) {
      await handleError(error, { showToast: false });
      return null;
    }
  }

  /** Blocks until a background-download slot is free; `quick` callers never call this. */
  private async acquireBackgroundDownloadSlot(): Promise<void> {
    if (this.backgroundDownloadSlotsInUse < this.MAX_CONCURRENT_BACKGROUND_DOWNLOADS) {
      this.backgroundDownloadSlotsInUse++;
      return;
    }
    await new Promise<void>(resolve => this.backgroundDownloadWaiters.push(resolve));
    this.backgroundDownloadSlotsInUse++;
  }

  /** Hands the freed slot to the longest-waiting queued background download, if any. */
  private releaseBackgroundDownloadSlot(): void {
    this.backgroundDownloadSlotsInUse--;
    this.backgroundDownloadWaiters.shift()?.();
  }

  /**
   * Download and cache audio file with retry logic.
   *
   * Downloads land in a temp file that is validated and then moved into the
   * final cache path. Android streams straight into the destination file, so
   * downloading to the final path directly would leave a truncated file behind
   * on a dropped connection — which getCachedFilePath would then treat as a
   * valid cache hit forever (the "this word never plays" bug).
   */
  private async cacheAudio(url: string, quick: boolean = false): Promise<string> {
    await this.ensureCacheDirectoryExists();

    const cacheKey = await this.generateCacheKey(url);
    const cachedFilePath = `${this.cacheDir}${cacheKey}`;

    const maxRetries = quick ? 0 : 2; // patient: 2 retries = 3 total attempts
    const timeoutMs = quick ? this.QUICK_DOWNLOAD_TIMEOUT_MS : this.DOWNLOAD_TIMEOUT_MS;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const tempFile = new File(
        `${cachedFilePath}.tmp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      );
      const abortController = new AbortController();
      const abortTimer = setTimeout(() => abortController.abort(), timeoutMs);
      const attemptStartedAt = Date.now();

      try {
        // Check network before retry (skip check on first attempt for efficiency)
        if (attempt > 0) {
          const netState = await NetInfo.fetch();
          if (!netState.isConnected) {
            throw new Error('No network connection available');
          }
          // Exponential backoff: 1s, 2s
          await new Promise<void>(resolve => setTimeout(resolve, 1000 * attempt));
        }

        if (!quick) await this.acquireBackgroundDownloadSlot();
        try {
          await File.downloadFileAsync(url, tempFile, {
            idempotent: true,
            signal: abortController.signal,
          });
        } finally {
          if (!quick) this.releaseBackgroundDownloadSlot();
        }

        if (!tempFile.exists || (tempFile.size ?? 0) <= 0) {
          throw new Error('Download failed - file is missing or empty after download');
        }

        await tempFile.move(new File(cachedFilePath), { overwrite: true });

        // Update memory cache
        this.memoryCache.set(cacheKey, { path: cachedFilePath, timestamp: Date.now() });
        this.evictIfNeeded();
        if (isSessionActive()) {
          const ms = Date.now() - attemptStartedAt;
          countDiag({ networkDownloads: 1, networkMs: ms });
          mark('cache.download.ok', { url: basename(url), ms, attempt, quick });
        }
        return cachedFilePath;
      } catch (error) {
        try {
          if (tempFile.exists) tempFile.delete();
        } catch {
          // Best-effort temp cleanup — an orphaned .tmp file is never served
        }

        lastError = error as Error;
        if (isSessionActive()) {
          countDiag({ networkFailures: 1 });
          mark('cache.download.fail', {
            url: basename(url),
            ms: Date.now() - attemptStartedAt,
            attempt,
            message: lastError.message,
          });
        }
        const errorMsg = lastError.message.toLowerCase();

        // Don't retry on non-network errors (4xx, file system errors, etc.)
        const isNetworkError =
          errorMsg.includes('network') ||
          errorMsg.includes('failed') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('abort') ||
          errorMsg.includes('connection');

        if (!isNetworkError || attempt >= maxRetries) {
          await handleError(lastError, { showToast: false });
          throw lastError;
        }
        // Continue to retry for network errors
      } finally {
        clearTimeout(abortTimer);
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
  async getAudio(url: string, options: GetAudioOptions = {}): Promise<string> {
    try {
      // Don't cache local files - return them directly
      if (!isRemoteAudioUrl(url)) {
        return url;
      }

      // Purge untrusted pre-overhaul cache files before serving anything
      // (one-time; never rejects — see ensureLegacySweep)
      await this.ensureLegacySweep();

      // First check if we have it cached
      const cachedPath = await this.getCachedFilePath(url);
      if (cachedPath) {
        countDiag({ cacheHits: 1 });
        return cachedPath;
      }

      // Check if download is already in progress for this URL
      const pendingDownload = this.pendingDownloads.get(url);
      if (pendingDownload) {
        if (isSessionActive()) mark('cache.await-inflight', { url: basename(url) });
        // Reuse the existing download promise instead of starting a new download
        return await pendingDownload;
      }

      // A miss during a live review session means the preloader did not get
      // here first — the session is about to make a network call the user can
      // hear as a delay. Loud on purpose.
      if (isSessionActive()) {
        mark('cache.MISS.network', { url: basename(url), quick: options.quick ?? false });
      }

      // Cache miss - start download and track it
      const downloadPromise = this.cacheAudio(url, options.quick ?? false);
      this.pendingDownloads.set(url, downloadPromise);

      try {
        const result = await downloadPromise;
        return result;
      } finally {
        // Clean up pending download tracking regardless of success/failure
        this.pendingDownloads.delete(url);
      }
    } catch (error) {
      await handleError(error, {
        showToast: false,
        toastMessage: 'Audio caching failed. The app may experience slower audio loading.',
      });
      // Return original URL on failed download as fallback
      return url;
    }
  }

  /**
   * Cache-hit-only lookup: returns the local path if the file is already on
   * disk, otherwise null. NEVER downloads.
   *
   * For long-form audio (a several-minute article) the caller usually wants to
   * start playing NOW and let expo-audio stream the remote URL, rather than
   * block on a full download first. This lets them prefer the local copy when
   * it exists without paying for it when it doesn't.
   *
   * Local (non-remote) sources are already playable as-is, so they come back
   * unchanged rather than reporting a miss.
   */
  async getCachedPath(url: string): Promise<string | null> {
    try {
      if (!isRemoteAudioUrl(url)) {
        return url;
      }
      await this.ensureLegacySweep();
      return await this.getCachedFilePath(url);
    } catch (error) {
      await handleError(error, { showToast: false });
      return null;
    }
  }

  /**
   * Warm the cache for a URL in the background. Fire-and-forget: resolves when
   * the file has landed (or failed), and never rejects. Use after handing a
   * remote URL to the player so the NEXT play of that track is local.
   */
  async prefetch(url: string): Promise<void> {
    try {
      await this.getAudio(url);
    } catch {
      // Best-effort warming — a failure just means the next play streams again
    }
  }

  /**
   * Drop a cached entry so the next getAudio() re-downloads it.
   *
   * Self-heal hook for playback: a cached file that fails to load is almost
   * always a corrupt/partial download, and without purging it the same broken
   * file would be served on every future play of that word.
   */
  async invalidate(url: string): Promise<void> {
    try {
      if (!isRemoteAudioUrl(url)) {
        return;
      }
      const cacheKey = await this.generateCacheKey(url);
      this.memoryCache.delete(cacheKey);
      const cachedFile = new File(`${this.cacheDir}${cacheKey}`);
      if (cachedFile.exists) {
        cachedFile.delete();
      }
    } catch (error) {
      await handleError(error, { showToast: false });
    }
  }

  /**
   * Clear all cached audio files
   */
  async clearCache(): Promise<void> {
    try {
      const cacheDir = new Directory(this.cacheDir);
      if (cacheDir.exists) {
        cacheDir.delete();
        await this.ensureCacheDirectoryExists();
      }
      // Clear memory cache and pending downloads
      this.memoryCache.clear();
      this.pendingDownloads.clear();
    } catch (error) {
      await handleError(error);
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

      // Directory#list() is synchronous in the SDK 57 API
      const items = cacheDir.list();

      const totalSize = items.reduce((size: number, item) => {
        // Only count files, not directories
        if ('size' in item && item.exists && item.size !== null) {
          return size + item.size;
        }
        return size;
      }, 0);

      return totalSize;
    } catch (error) {
      await handleError(error);
      return 0;
    }
  }
}

// Export singleton instance
export const audioCache = AudioCacheManager.getInstance();
