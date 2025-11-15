'use client';

import { useState, useRef, useEffect } from 'react';
import type { Database } from '@/lib/database.types';
import { ArabicWord } from '@/components/arabic-word';
import { Play, Pause } from 'lucide-react';

type ArticleSentence = Database['public']['Tables']['article_sentences']['Row'];
type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

interface SentencePairProps {
  sentence: ArticleSentence;
  words: SentenceWord[];
  isLast?: boolean;
}

function normalizeAudioUrl(audioUrl: string): string {
  if (!audioUrl) return '';
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }
  return `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio/${audioUrl}`;
}

export function SentencePair({ sentence, words, isLast = false }: SentencePairProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayAudio = async () => {
    if (!sentence.audio_url) return;

    try {
      // If already playing, pause it
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // Create or reuse audio element
      if (!audioRef.current) {
        const normalizedUrl = normalizeAudioUrl(sentence.audio_url);
        audioRef.current = new Audio(normalizedUrl);
        audioRef.current.addEventListener('ended', () => setIsPlaying(false));
        audioRef.current.addEventListener('error', (e) => {
          console.error('Audio error:', e, 'URL:', normalizedUrl);
          setIsLoading(false);
          setIsPlaying(false);
        });
      }

      setIsLoading(true);
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <div className={`group ${isLast ? '' : 'mb-10'}`}>
      {/* Arabic Sentence - Primary (Word by Word) with Audio Button */}
      <div className="flex items-start gap-3 mb-1.5">
        <div
          lang="ar"
          dir="rtl"
          className="flex-1 text-2xl md:text-[28px] leading-[1.9] text-right text-foreground"
        >
          {words.length > 0 ? (
            words.map((word, index) => (
              <span key={word.id}>
                <ArabicWord
                  wordForm={word.word_form}
                  english={word.english}
                  grammarNote={word.grammar_note}
                />
                {/* Add space between words */}
                {index < words.length - 1 && ' '}
              </span>
            ))
          ) : (
            // Fallback to full sentence if no words available
            <span
              style={{
                fontFamily: 'Madina, "Noto Naskh Arabic", "Traditional Arabic", serif',
                fontFeatureSettings: '"calt" 1, "liga" 1, "kern" 1',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                fontWeight: 500,
              }}
            >
              {sentence.arabic}
            </span>
          )}
        </div>

        {/* Subtle Audio Play Button */}
        {sentence.audio_url && (
          <button
            onClick={handlePlayAudio}
            disabled={isLoading}
            className="flex-shrink-0 p-2 rounded-md text-muted-foreground/35 hover:text-primary hover:bg-primary/6 transition-[color,background-color] duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1"
            aria-label={isPlaying ? 'Pause Arabic audio' : 'Play Arabic audio'}
            title={isPlaying ? 'Pause' : 'Play Arabic audio'}
          >
            {isLoading ? (
              <div className="h-4 w-4 rounded-full bg-primary animate-pulse-sage" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 text-primary fill-primary" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* English Translation - Support */}
      <p
        lang="en"
        className="text-xl md:text-[21px] leading-[1.7] mb-5 font-serif text-foreground/75 text-left"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          letterSpacing: '0.01em',
          fontWeight: 400,
        }}
      >
        {sentence.english}
      </p>
    </div>
  );
}
