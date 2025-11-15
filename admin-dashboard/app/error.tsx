'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Error boundary for homepage
 * Catches errors in server/client components and shows user-friendly message
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Homepage error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>

        <p className="text-muted-foreground mb-8">
          We encountered an error while loading articles. This could be a temporary issue with our
          database connection.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>

          <a
            href="/"
            className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Go to homepage
          </a>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-8">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
