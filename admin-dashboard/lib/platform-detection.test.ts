import { beforeEach, describe, expect, it, vi } from 'vitest';

const headersMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

const setUserAgent = (ua: string) => {
  headersMock.mockResolvedValue({
    get: (key: string) => (key.toLowerCase() === 'user-agent' ? ua : null),
  });
};

describe('detectPlatform', () => {
  beforeEach(() => {
    headersMock.mockReset();
  });

  it('classifies an iPhone UA as ios with App Store URL', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    const { detectPlatform } = await import('./platform-detection');
    const info = await detectPlatform();
    expect(info.platform).toBe('ios');
    expect(info.isMobile).toBe(true);
    expect(info.appStoreUrl).toContain('apps.apple.com');
    expect(info.storeName).toBe('App Store');
  });

  it('classifies an iPad UA as ios', async () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)');
    const { detectPlatform } = await import('./platform-detection');
    expect((await detectPlatform()).platform).toBe('ios');
  });

  it('classifies an Android UA as android with Google Play URL', async () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120',
    );
    const { detectPlatform } = await import('./platform-detection');
    const info = await detectPlatform();
    expect(info.platform).toBe('android');
    expect(info.isMobile).toBe(true);
    expect(info.appStoreUrl).toContain('play.google.com');
    expect(info.storeName).toBe('Google Play');
  });

  it('classifies a desktop Chrome UA as desktop with no store', async () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120',
    );
    const { detectPlatform } = await import('./platform-detection');
    const info = await detectPlatform();
    expect(info.platform).toBe('desktop');
    expect(info.isMobile).toBe(false);
    expect(info.appStoreUrl).toBeNull();
    expect(info.storeName).toBeNull();
  });

  it('falls back to desktop when User-Agent header is missing', async () => {
    headersMock.mockResolvedValue({ get: () => null });
    const { detectPlatform } = await import('./platform-detection');
    expect((await detectPlatform()).platform).toBe('desktop');
  });
});
