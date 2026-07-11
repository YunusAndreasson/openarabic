import { describe, expect, it } from 'vitest';
import { classifyUserAgent, storeRedirectUrl } from './user-agent';
import { APP_STORE_URL, PLAY_STORE_URL } from './app';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120';
const DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120';
const GOOGLEBOT_MOBILE =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const FB_PREVIEW =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

describe('classifyUserAgent', () => {
  it('detects iOS with the App Store URL', () => {
    const info = classifyUserAgent(IPHONE);
    expect(info.platform).toBe('ios');
    expect(info.appStoreUrl).toBe(APP_STORE_URL);
    expect(info.isBot).toBe(false);
  });

  it('detects Android with the Google Play URL', () => {
    const info = classifyUserAgent(ANDROID);
    expect(info.platform).toBe('android');
    expect(info.appStoreUrl).toBe(PLAY_STORE_URL);
    expect(info.isBot).toBe(false);
  });

  it('marks Googlebot Smartphone (Android UA) as a bot', () => {
    const info = classifyUserAgent(GOOGLEBOT_MOBILE);
    expect(info.platform).toBe('android');
    expect(info.isBot).toBe(true);
  });
});

describe('storeRedirectUrl', () => {
  it('sends iPhones to the App Store', () => {
    expect(storeRedirectUrl(IPHONE)).toBe(APP_STORE_URL);
  });

  it('sends Androids to Google Play', () => {
    expect(storeRedirectUrl(ANDROID)).toBe(PLAY_STORE_URL);
  });

  it('does not redirect desktop', () => {
    expect(storeRedirectUrl(DESKTOP)).toBeNull();
  });

  it('does not redirect Googlebot Smartphone (keeps /download-app indexable)', () => {
    expect(storeRedirectUrl(GOOGLEBOT_MOBILE)).toBeNull();
  });

  it('does not redirect link-preview fetchers', () => {
    expect(storeRedirectUrl(FB_PREVIEW)).toBeNull();
  });
});
