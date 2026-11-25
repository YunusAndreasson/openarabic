import { onlineManager } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';

import { isKnownOffline } from '@/utils/network';

const DIRECTORY = 'public-articles-v1';
const RECENT_ARTICLE_LIMIT = 12;

export const publicArticleCache = {
  async read<T>(name: string, fetchOnline: () => Promise<T>): Promise<T> {
    if (!onlineManager.isOnline() || (await isKnownOffline())) {
      try {
        const file = new File(Paths.cache, DIRECTORY, name);
        if (file.exists) return JSON.parse(await file.text()) as T;
      } catch {
        // A missing or evicted file falls through to the same offline error.
      }
      throw new Error('Public article data is unavailable offline');
    }

    const value = await fetchOnline();
    try {
      const directory = new Directory(Paths.cache, DIRECTORY);
      directory.create({ idempotent: true, intermediates: true });
      await new File(directory, name).write(JSON.stringify(value));
      const details = directory
        .list()
        .filter(
          (entry): entry is File => entry instanceof File && entry.name.startsWith('article-'),
        );
      details.sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
      for (const file of details.slice(RECENT_ARTICLE_LIMIT)) file.delete();
    } catch {
      // Cache storage is opportunistic. A successful catalog read is still usable.
    }
    return value;
  },

  size(): number {
    const directory = new Directory(Paths.cache, DIRECTORY);
    return directory.exists ? (directory.size ?? 0) : 0;
  },

  clear() {
    const directory = new Directory(Paths.cache, DIRECTORY);
    if (directory.exists) directory.delete();
  },
};
