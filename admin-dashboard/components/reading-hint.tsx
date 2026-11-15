'use client';

import { useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'reading-hint-dismissed';

const subscribeNever = () => () => {};

export function ReadingHint() {
  // Hidden on the server and during hydration; on the client, shown until the
  // user has dismissed it (now or on an earlier visit).
  const dismissedBefore = useSyncExternalStore(
    subscribeNever,
    () => localStorage.getItem(STORAGE_KEY) === 'true',
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const isVisible = !dismissedBefore && !dismissedNow;

  const handleDismiss = () => {
    setDismissedNow(true);
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
