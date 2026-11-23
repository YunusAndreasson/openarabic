import { Alert, Platform, Share } from 'react-native';

import { STRINGS } from '@/constants/strings';
import type { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';

const SITE_URL = 'https://openarabic.io';

interface PublicLink {
  title: string;
  url: string;
}

// openarabic-web/src/lib/words.mjs is the source of truth for both public paths.
function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getArticleShareLink(
  article: Pick<Article, 'id' | 'title' | 'published'>,
): PublicLink | null {
  if (!article.published) return null;
  return {
    title: article.title,
    url: `${SITE_URL}/read/${slugifyText(article.title)}-${article.id}`,
  };
}

export function getWordShareLink(
  root: Pick<Tables<'roots'>, 'id' | 'letters' | 'meaning'> | null | undefined,
): PublicLink | null {
  // The site builds dictionary entries for roots with both letters and a gloss.
  if (
    !root?.meaning.trim() ||
    !root.letters.trim() ||
    !Number.isSafeInteger(root.id) ||
    root.id <= 0
  )
    return null;
  return {
    title: `${root.letters} · ${root.meaning}`,
    url: `${SITE_URL}/word/${slugifyText(root.meaning) || 'word'}-${root.id}`,
  };
}

export async function sharePublicLink({ title, url }: PublicLink): Promise<void> {
  try {
    await Share.share(Platform.OS === 'ios' ? { url, title } : { message: `${title}\n${url}` });
  } catch {
    Alert.alert(STRINGS.SHARE_FAILED, STRINGS.PLEASE_TRY_AGAIN);
  }
}
