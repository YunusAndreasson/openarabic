import { Star } from 'lucide-react';

interface AppRatingProps {
  /** From getAppRating; null means the lookup failed, and nothing is shown. */
  rating: number | null;
  className?: string;
}

/**
 * Quiet social proof: the App Store rating as Apple reports it, with no count.
 * Ratings differ by storefront, so this names the one it comes from.
 */
export function AppRating({ rating, className }: AppRatingProps) {
  if (rating === null) return null;

  // Whole stars earned at the precision shown, so a 4.5 never shows as five stars.
  const stars = Math.floor(Number(rating.toFixed(1)));

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < stars ? 'fill-[#c2a24e] text-[#c2a24e]' : 'fill-muted text-muted'}`}
          />
        ))}
      </span>
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">on the US App Store</span>
    </span>
  );
}
