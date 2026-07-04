import { Star } from 'lucide-react';
import { APP_RATING } from '@/lib/app';

interface AppRatingProps {
  className?: string;
}

/**
 * Quiet social proof: the real App Store rating as gold stars plus the number.
 * Honest — the average rating and nothing it can't back up (no review counts).
 */
export function AppRating({ className }: AppRatingProps) {
  const rounded = Math.round(APP_RATING);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < rounded ? 'fill-[#c2a24e] text-[#c2a24e]' : 'fill-muted text-muted'}`}
          />
        ))}
      </span>
      <span className="font-medium text-foreground">{APP_RATING.toFixed(1)}</span>
      <span className="text-muted-foreground">on the App Store</span>
    </span>
  );
}
