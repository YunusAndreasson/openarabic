import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Alert, Platform, Share } from 'react-native';

import { articleId } from '@/__tests__/helpers/ids';
import { STRINGS } from '@/constants/strings';
import { getArticleShareLink, getWordShareLink, sharePublicLink } from '@/utils/publicShare';

describe('public site paths', () => {
  // Expected paths from articlePath in openarabic-web/src/lib/words.mjs.
  test.each([
    ['Ṣayd al-Khāṭir', '/read/ayd-al-kh-ir-279'],
    ["A Reader's Notebook", '/read/a-reader-s-notebook-279'],
    ['The Reader’s Guide', '/read/the-reader-s-guide-279'],
    ['كتاب', '/read/-279'],
  ])('keeps the site slug for %s', (title, path) => {
    expect(getArticleShareLink({ id: articleId(279), title, published: true })).toEqual({
      title,
      url: `https://openarabic.io${path}`,
    });
  });

  test('omits unpublished articles', () => {
    expect(
      getArticleShareLink({ id: articleId(279), title: 'Draft', published: false }),
    ).toBeNull();
  });

  const root = { id: 5222, meaning: 'to write', letters: 'كَتَبَ' };

  test('builds the dictionary path from the meaning and root ID', () => {
    expect(getWordShareLink(root)?.url).toBe('https://openarabic.io/word/to-write-5222');
    expect(getWordShareLink({ ...root, meaning: 'كتاب' })?.url).toBe(
      'https://openarabic.io/word/word-5222',
    );
  });

  test.each([
    undefined,
    null,
    { ...root, id: 0 },
    { ...root, id: NaN },
    { ...root, meaning: '  ' },
    { ...root, letters: ' ' },
  ])('omits incomplete root %j', record => {
    expect(getWordShareLink(record)).toBeNull();
  });
});

describe('native sharing', () => {
  const link = { title: 'An article', url: 'https://openarabic.io/read/an-article-279' };
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('hands a URL to iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await sharePublicLink(link);
    expect(Share.share).toHaveBeenCalledWith(link);
  });

  test('includes the title and URL in the Android message', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await sharePublicLink(link);
    expect(Share.share).toHaveBeenCalledWith({ message: `${link.title}\n${link.url}` });
  });

  test('reports a native presentation failure', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('Unavailable'));
    await sharePublicLink(link);
    expect(Alert.alert).toHaveBeenCalledWith(STRINGS.SHARE_FAILED, STRINGS.PLEASE_TRY_AGAIN);
  });
});
