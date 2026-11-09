import { afterEach, describe, expect, it, vi } from 'vitest';

import cloudflareImageLoader from './cloudflare-image-loader';

const HOST = 'kkmnzbeugdoajtzfjkxg.supabase.co';

describe('cloudflareImageLoader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resizes images served by the Supabase project', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const src = `https://${HOST}/storage/v1/object/public/a.jpg`;
    expect(cloudflareImageLoader({ src, width: 640 })).toBe(
      `/cdn-cgi/image/width=640,quality=75,format=auto/${src}`,
    );
  });

  it('does not resize look-alike hosts', () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const src of [
      `https://${HOST}.evil.example/a.jpg`,
      `https://${HOST}@evil.example/a.jpg`,
      `http://${HOST}/a.jpg`,
    ]) {
      expect(cloudflareImageLoader({ src, width: 640 })).toBe(src);
    }
  });
});
