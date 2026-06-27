'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';

interface AudioButtonProps {
  src: string;
  /** When provided, renders a labelled pill (e.g. "Arabic"); otherwise an icon-only circle. */
  label?: string;
  className?: string;
}

/**
 * Small client-side audio player matching the site's audio UI (used by
 * SentencePair). Lazily constructs the Audio element on first play and cleans
 * up on unmount. Labelled = pill (for the word header); unlabelled = round icon
 * button (for inline example sentences).
 */
export function AudioButton({ src, label, className }: AudioButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = async () => {
    if (state === 'playing' && audioRef.current) {
      audioRef.current.pause();
      setState('idle');
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.addEventListener('ended', () => setState('idle'));
      audioRef.current.addEventListener('error', () => setState('idle'));
    }
    try {
      setState('loading');
      await audioRef.current.play();
      setState('playing');
    } catch {
      setState('idle');
    }
  };

  const Icon =
    state === 'loading' ? Loader2 : state === 'playing' ? Pause : label ? Volume2 : Play;
  const iconClass = `h-4 w-4${state === 'loading' ? ' animate-spin' : ''}`;

  if (label) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={state === 'playing' ? `Pause ${label} audio` : `Play ${label} audio`}
        className={`inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-muted/50 ${className ?? ''}`}
      >
        <Icon className={`${iconClass} text-primary`} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={state === 'playing' ? 'Pause audio' : 'Play audio'}
      className={`inline-flex items-center justify-center h-9 w-9 flex-shrink-0 rounded-full text-muted-foreground/70 transition-colors hover:bg-primary/5 hover:text-primary ${className ?? ''}`}
    >
      <Icon className={`${iconClass}${state !== 'loading' ? ' text-current' : ' text-primary'}`} />
    </button>
  );
}
