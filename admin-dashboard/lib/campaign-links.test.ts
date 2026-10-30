import { describe, expect, it } from 'vitest';
import { APP_STORE_URL, PLAY_STORE_URL } from './app';
import { withCampaign } from './campaign-links';

const tags = (query: string) => new URLSearchParams(query);

describe('withCampaign', () => {
  it('puts the tags inside the referrer on Google Play', () => {
    const url = new URL(
      withCampaign(
        PLAY_STORE_URL,
        tags('utm_source=instagram&utm_medium=organic&utm_campaign=bio'),
        undefined,
      ),
    );
    expect(url.searchParams.get('referrer')).toBe(
      'utm_source=instagram&utm_medium=organic&utm_campaign=bio',
    );
    expect(url.searchParams.get('id')).toBe('com.edenmind.OpenArabic');
    expect(url.searchParams.has('utm_source')).toBe(false);
  });

  it('uses the campaign token on the App Store', () => {
    const url = new URL(withCampaign(APP_STORE_URL, tags('utm_campaign=bio'), '12345'));
    expect(url.searchParams.get('ct')).toBe('bio');
    expect(url.searchParams.get('pt')).toBe('12345');
  });

  it('leaves the App Store link plain without a provider token, which Apple would ignore', () => {
    expect(withCampaign(APP_STORE_URL, tags('utm_campaign=bio'), undefined)).toBe(
      new URL(APP_STORE_URL).toString(),
    );
  });

  it('trims a campaign to the 40 characters Apple allows', () => {
    const url = new URL(withCampaign(APP_STORE_URL, tags(`utm_campaign=${'c'.repeat(60)}`), '1'));
    expect(url.searchParams.get('ct')).toHaveLength(40);
  });

  it('returns the plain link when there are no tags', () => {
    expect(withCampaign(PLAY_STORE_URL, tags(''), undefined)).toBe(
      new URL(PLAY_STORE_URL).toString(),
    );
    expect(withCampaign(APP_STORE_URL, tags('other=1'), '1')).toBe(
      new URL(APP_STORE_URL).toString(),
    );
  });

  it('drops tags that are too long or carry anything unexpected', () => {
    const url = new URL(
      withCampaign(
        PLAY_STORE_URL,
        tags(`utm_source=${encodeURIComponent('a&b=c')}&utm_medium=${'m'.repeat(101)}&utm_campaign=ok`),
        undefined,
      ),
    );
    expect(url.searchParams.get('referrer')).toBe('utm_campaign=ok');
  });

  it('ignores anything that isn’t a UTM tag', () => {
    const url = new URL(
      withCampaign(PLAY_STORE_URL, tags('fbclid=abc&utm_campaign=ok&gclid=def'), undefined),
    );
    expect(url.searchParams.get('referrer')).toBe('utm_campaign=ok');
  });
});
