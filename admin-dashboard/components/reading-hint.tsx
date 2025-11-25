'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'reading-hint-dismissed';

export function ReadingHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the hint before
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg text-sm text-muted-foreground mb-8">
      <span className="flex-1">
        <span className="font-medium text-foreground">Tip:</span> Tap any Arabic
        word to see its meaning.
      </span>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 text-muted-foreground/60 hover:text-muted-foreground rounded transition-colors"
        aria-label="Dismiss tip"
      >
        <X size={16} />
      </button>
    </div>
  );
}
