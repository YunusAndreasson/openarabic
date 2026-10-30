'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  type AnalyticsChoice,
  clearAnalyticsChoice,
  readAnalyticsChoice,
  saveAnalyticsChoice,
  subscribeAnalyticsChoice,
} from '@/lib/analytics-consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const choose = (choice: AnalyticsChoice) => {
  saveAnalyticsChoice(choice);
  window.gtag?.('consent', 'update', { analytics_storage: choice });
  if (choice === 'granted') window.gtag?.('config', GA_ID);
};

/**
 * Asks once, with allowing and refusing equally easy, and starts Google Analytics
 * only after someone agrees. There's nothing to ask about when analytics isn't set
 * up, and nothing to show on the server, where no choice can be read.
 */
export function AnalyticsConsent() {
  const needsChoice = useSyncExternalStore(
    subscribeAnalyticsChoice,
    () => readAnalyticsChoice() === null,
    () => false,
  );

  if (!GA_ID || !needsChoice) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics choice"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          May we use Google Analytics to see how visitors find and use this site? It sets cookies,
          and because this site is about Islamic texts, visits could suggest your beliefs.{' '}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => choose('denied')}>
            Refuse
          </Button>
          <Button variant="outline" onClick={() => choose('granted')}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Lets someone change their mind later, from the privacy page. */
export function ChangeAnalyticsChoice() {
  const reopen = () => {
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    clearAnalyticsChoice();
  };

  return (
    <Button variant="outline" onClick={reopen}>
      Change my analytics choice
    </Button>
  );
}
