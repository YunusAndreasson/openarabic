import type { Metadata } from 'next';
import Image from 'next/image';
import { detectPlatform } from '@/lib/platform-detection';

export const metadata: Metadata = {
  title: 'Download OpenArabic - Read Classical Islamic Texts in Arabic & English',
  description:
    'Read classical Islamic texts with side-by-side Arabic and English. Listen to audio, build vocabulary, and learn Arabic naturally.',
  openGraph: {
    title: 'Download OpenArabic',
    description:
      'Classical Islamic texts in Arabic & English with audio. Free on iOS and Android.',
    url: 'https://openarabic.io/download-app',
    images: [
      {
        url: 'https://openarabic.io/oaLogo.png',
        width: 512,
        height: 512,
        alt: 'OpenArabic App',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Download OpenArabic',
    description:
      'Classical Islamic texts in Arabic & English with audio. Free on iOS and Android.',
    images: ['https://openarabic.io/oaLogo.png'],
  },
};

const APP_STORE_URL = 'https://apps.apple.com/ae/app/openarabic/id1594031029';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.edenmind.OpenArabic';

export default async function DownloadPage() {
  const platformInfo = await detectPlatform();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="max-w-sm w-full text-center space-y-8">
        {/* App Icon */}
        <div className="flex justify-center">
          <Image
            src="/oaLogo.png"
            alt="OpenArabic"
            width={120}
            height={120}
            className="rounded-[28px] shadow-lg"
            priority
          />
        </div>

        {/* App Info */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">OpenArabic</h1>
          <p className="text-muted-foreground">
            Read classical Islamic texts in Arabic with English translations.
            Listen to audio and build your vocabulary naturally.
          </p>
        </div>

        {/* Store Buttons */}
        <div className="space-y-3">
          {/* App Store Button */}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 w-full py-3 px-5 rounded-xl font-medium transition-all duration-200 ${
              platformInfo.platform === 'ios'
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <AppleIcon className="w-8 h-8 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[11px] opacity-80 leading-tight">Download on the</div>
              <div className="text-lg font-semibold leading-tight">App Store</div>
            </div>
          </a>

          {/* Play Store Button */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 w-full py-3 px-5 rounded-xl font-medium transition-all duration-200 ${
              platformInfo.platform === 'android'
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <PlayStoreIcon className="w-7 h-7 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[11px] uppercase opacity-80 leading-tight">Get it on</div>
              <div className="text-lg font-semibold leading-tight">Google Play</div>
            </div>
          </a>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4">
          Free to download. Start your Arabic journey today.
        </p>
      </div>
    </div>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}
