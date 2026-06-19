import type { MetadataRoute } from 'next';
import {
  APP_NAME,
  APP_DESCRIPTION,
  APP_STORE_ID,
  APP_STORE_URL,
  ANDROID_PACKAGE,
  PLAY_STORE_URL,
} from '@/lib/app';

/**
 * Web App Manifest (served at /manifest.webmanifest; Next injects the
 * <link rel="manifest"> automatically).
 *
 * `related_applications` + `prefer_related_applications` signal to the browser
 * (notably Chrome on Android) that a native app exists, so it can surface a
 * native-install affordance instead of a web-app install prompt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f8faf9',
    theme_color: '#f8faf9',
    icons: [
      { src: '/oaLogo.png', sizes: '512x512', type: 'image/png' },
    ],
    related_applications: [
      { platform: 'itunes', url: APP_STORE_URL, id: APP_STORE_ID },
      { platform: 'play', url: PLAY_STORE_URL, id: ANDROID_PACKAGE },
    ],
    prefer_related_applications: true,
  };
}
