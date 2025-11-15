'use client';

import type { ReactNode } from 'react';

interface ArticleContentProps {
  children: ReactNode;
  summary?: string;
  audioUrlBilingual?: string | null;
}

function normalizeAudioUrl(audioUrl: string): string {
  if (!audioUrl) return '';
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }
  return `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio/${audioUrl}`;
}

export function ArticleContent({ children, summary, audioUrlBilingual }: ArticleContentProps) {
  return (
    <article className="py-12 md:py-16">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Summary (if provided) */}
        {summary && (
          <div className="mb-12">
            <p className="text-2xl md:text-3xl text-foreground/80 leading-relaxed font-normal">
              {summary}
            </p>
          </div>
        )}

        {/* Bilingual Audio Player */}
        {audioUrlBilingual && (
          <div className="mb-12">
            <audio
              controls
              preload="metadata"
              className="w-full audio-player"
              style={{
                height: '48px',
                borderRadius: '12px',
              }}
            >
              <source src={normalizeAudioUrl(audioUrlBilingual)} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <p className="text-xs text-muted-foreground/60 mt-2 text-center">
              Listen to full article (Arabic & English)
            </p>
          </div>
        )}

        {/* Main Content - No box, clean reading experience */}
        <div className="space-y-10">
          {children}
        </div>
      </div>
    </article>
  );
}
